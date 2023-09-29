import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from "@angular/core"
import { DragSelectorTargetDirective } from "./drag-selector-target.directive"

interface Drawbox {
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
  
  x: number
  y: number
  
  width: number
  height: number
  
  backwardsX: boolean
  backwardsY: boolean
}

@Directive({
  selector: '[drag-selector]',
  exportAs: 'dragSelector'
}) export class DragSelectorDirective {
  @Input('drag-selector') selected: any[] = []
  @Output('drag-selector-change') selectedChange = new EventEmitter<any[]>()

  drawBox?: Drawbox // when dragging to highlight multiple lights
  targets: DragSelectorTargetDirective[] = []
  interval?: any
  timeout?: any
  processing = false

  constructor(public elementRef: ElementRef) {
    this.elementRef.nativeElement.style.position = 'relative'
  }

  @HostListener('click') onClick() {
    if ( this.processing ) {
      return
    }

    this.selected.length = 0
    this.targets.forEach(target => target.selected = false)
    this.selectedChange.emit(this.selected)
  }

  @HostListener('mousedown', ['$event']) onDragStart(
    $event: MouseEvent
  ) {
    clearInterval(this.interval)
    clearTimeout(this.timeout)
    delete this.drawBox
    const target = $event.target

    const isDirectTap = target !== this.elementRef.nativeElement
    if ( !target || isDirectTap ) {
      return
    }

    const drawBoxElm = createDrawBoxElm()
    this.elementRef.nativeElement.appendChild(drawBoxElm)
    // const listenTarget = $event.target // window

    const drawBox: Drawbox = this.drawBox = {
      startX: $event.x,
      startY: $event.y,
      startOffsetX: $event.offsetX,
      startOffsetY: $event.offsetY,
      
      x: -1,
      y: -1,
      
      width: -1,
      height: -1,
      
      backwardsX: false,
      backwardsY: false,
    }

    this.interval = setInterval(() => {
      // const lightElements = new Array(...document.querySelectorAll('.light') as any) as HTMLElement[]
      const lightElements = this.targets.map(target => target.elementRef.nativeElement)
      
      const targets = getTargetsInDrawBoxBounds(lightElements, drawBoxElm)

      const values = this.targets.filter(target => {
        const found = targets.find(allTarget => allTarget === target.elementRef.nativeElement)
        target.selected = found ? true : false
        return found
      }
      ).map(target => target.dragSelectorTarget)
      
      this.selected.length = 0
      this.selected.push(...values)
      this.selectedChange.emit(values)
    }, 500)

    const close = () => {
      clearInterval(this.interval)
      clearTimeout(this.timeout) // ensure another hasnt been created
      delete this.drawBox
      this.elementRef.nativeElement.removeChild(drawBoxElm)
      
      listeners.forEach(x =>
        x.target.removeEventListener(x.type, x.callback as () => any)
      )

      // sometimes release is considered a click, hold our processing just a little longer
      setTimeout(() => this.processing = false, 100)
    }

    // if idle for 8s then close
    this.timeout = setTimeout(close, 8000)

    const listeners = [{
      type: 'mouseup',
      target: window,
      callback: close,
    },{
      type: 'mouseleave',
      target: $event.target,
      callback: close,
    }/*,{
      type: 'mouseout',
      target: $event.target,
      callback: close,
    }*/, {
      type: 'mousemove',
      target: window,
      callback: ($move: MouseEvent) => {
        // reset idle timeout
        clearTimeout(this.timeout)
        this.timeout = setTimeout(close, 8000)

        if ( $move.offsetX < 0 || $move.offsetY < 0 ) {
          return
        }

        drawBoxElm.style.top = drawBox.y + 'px'
        drawBoxElm.style.left = drawBox.x + 'px'
        drawBoxElm.style.width = drawBox.width + 'px'
        drawBoxElm.style.height = drawBox.height + 'px'
    
        updateDrawBoxBounds(drawBox, $move)
      }
    }]

    listeners.forEach(x =>
      x.target.addEventListener(x.type, x.callback as () => any)
    )

    // mousedown maybe was a click, lets wait a moment before we are considered starting to draw
    setTimeout(() => this.processing = true, 350)
  }
}

function updateDrawBoxBounds(
  drawBox: Drawbox,
  $move: MouseEvent
) {
  drawBox.backwardsX = drawBox.startX >= $move.x
  drawBox.backwardsY = drawBox.startY >= $move.y

  drawBox.width = drawBox.backwardsX ? drawBox.startX - $move.x : $move.x - drawBox.startX // $move.offsetX
  // drawBox.width = $move.x - drawBox.startX // $move.offsetX
  drawBox.height = drawBox.backwardsY ? drawBox.startY - $move.y : $move.y - drawBox.startY // $move.offsetX
  // drawBox.height = $move.y - drawBox.startY // $move.offsetX

  drawBox.x = drawBox.backwardsX ? drawBox.startOffsetX - (drawBox.startX - $move.x) : drawBox.startOffsetX
  drawBox.y = drawBox.backwardsY ? drawBox.startOffsetY - (drawBox.startY - $move.y) : drawBox.startOffsetY
}

/** TODO: This works off of document selecting but needs to be Angular elements
 * GOAL: Be able to get ContentChildren and return something as they become selected
*/
function getTargetsInDrawBoxBounds(
  elements: HTMLElement[],
  drawBox: HTMLElement,
  // drawBox: Drawbox,
) {
  const boxBounds = {
    left: drawBox.offsetLeft,
    top: drawBox.offsetTop,
    width: drawBox.offsetWidth,
    height: drawBox.offsetHeight,
  }

  return elements.filter(elm => {
    const left = elm.offsetLeft
    const top = elm.offsetTop
    const width = elm.offsetWidth
    const height = elm.offsetHeight
    
    // is the top of draw box Y less than the compare
    const withinTop = boxBounds.top < top
    // is the left of draw box X less than the compare
    const withinLeft = boxBounds.left < left

    if ( !withinTop || !withinLeft ) {
      return
    }

    // is the bottom lower than the compare
    const withinBottom = boxBounds.top + boxBounds.height > top + height
    // is the right farther than the compare
    const withinRight = boxBounds.left + boxBounds.width > left + width

    if ( !withinBottom || !withinRight ) {
      return
    }

    return elm
  })
}

function createDrawBoxElm() {
  const elm = document.createElement('div')
  elm.style.position = 'absolute'
  elm.style.border = '2px dashed white'
  elm.style.overflow = 'hidden'
  elm.style.opacity = '.60'
  // elm.style.zIndex = '11'
  elm.innerHTML = '&nbsp;'
  return elm
}