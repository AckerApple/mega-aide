import { Directive, EventEmitter, HostListener, Input, Output, SimpleChanges } from '@angular/core'

/** Press any key to stop listening */
@Directive({
  selector: "[nextMouse]",
  exportAs: "nextMouse"
})
export class NextMouseDirective {
  @Input() startByEvent?: 'click' | 'dblclick' | 'contextmenu'
  
  @Input() nextMouse?: number
  @Output() nextMouseChange: EventEmitter<number> = new EventEmitter()
  
  @Input('nextMouseListening') listening: boolean | number | undefined
  @Output('nextMouseListeningChange') listeningChange: EventEmitter<boolean> = new EventEmitter()

  handler: (event: MouseEvent) => any
  contextHandler: (event: MouseEvent) => any
  keyHandler: (event: KeyboardEvent) => any

  constructor(){
    this.handler = (event) => this.onDown(event)
    this.contextHandler = (event) => event.preventDefault()
    this.keyHandler = () => this.stop()
  }

  ngOnChanges( changes: SimpleChanges ){
    if ( changes['listening'] ) {
      const wasListening = changes['listening'].previousValue
      const changed = !!wasListening && !!this.listening

      if ( !changed ) {
        return // its not different than it is
      }

      if ( !this.listening ) {
        this.stop()
      } else {
        this.start()
      }
    }
  }

  ngOnDestroy(){
    this.stop()
  }

  toggleListen() {
    if ( this.listening ) {
      this.stop()
    } else {
      this.start()
    }
  }

  start() {
    window.addEventListener('mousedown', this.handler)
    window.addEventListener('contextmenu', this.contextHandler)
    window.addEventListener('keydown', this.keyHandler)
    this.listeningChange.emit(this.listening=true)
  }

  @HostListener('click') onClick() {
    if ( this.startByEvent && this.startByEvent !== 'click' ) {
      return
    }
    this.toggleListen()
  }
  
  @HostListener('contextmenu', ['$event']) onRightClick(event: MouseEvent) {
    if ( this.startByEvent !== 'contextmenu' ) {
      return
    }

    this.toggleListen()
    event.preventDefault() // prevent menu from coming out
  }
  
  @HostListener('dblclick') onDblClick() {
    if ( this.startByEvent !== 'dblclick' ) {
      return
    }
    this.toggleListen()
  }

  stop() {
    window.removeEventListener('mousedown', this.handler)
    window.removeEventListener('contextmenu', this.contextHandler)
    window.removeEventListener('keydown', this.keyHandler)
    this.listeningChange.emit(this.listening = false)
  }

  onDown(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.stop()
    this.nextMouseChange.emit(this.nextMouse=event.button)
    return false
  }
}
