import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core'
import { Control, PlatformMap } from '../platforms'
import { LastButtons } from './LastButtons.provider'
import { PressedObject } from './LastPresses.provider'
import { LabelType } from './platform-filters.directive'

@Component({
  selector: 'platform-control-map',
  templateUrl: './platform-control-map.component.html',
})
export class PlatformControlMapComponent {  
  @Output() controlClick = new EventEmitter<Control>()
  
  @Input() controlListen?: Control // indication of listening for next key press
  @Output() controlListenChange = new EventEmitter<Control>()

  @Input() lastDrag?: LastDrag
  @Output() lastDragChange = new EventEmitter<LastDrag>()

  @Input() playerIndex!: number  
  @Input() controllerSize: number = 16
  @Input() platform!: PlatformMap

  // what is pressed?
  @Input() pressedObject: PressedObject = {}
  @Input() buttonsObject: LastButtons = {}

  @Input() remap?: Remap[]
  @Input() labelType: LabelType = true // button labels or key labels

  controls?: Control[]
  remapped!: Control[]

  ngOnInit(){
    this.remapPlatform()
  }

  ngOnChanges(changes: SimpleChanges){
    if ( changes['controls'] || changes['platform'] || changes['remap'] ) {
      this.remapPlatform()
    }
  }

  remapPlatform() {
    const players = this.platform.players
    this.controls = players[ this.playerIndex ]
    const controls = this.remapped = this.controls.map(clone => ({...clone}))
    const remap = this.remap
    
    if ( !controls || !remap ) {
      return
    }

    controls.forEach(control => {
      const remapFind = remap.find(map =>
        control.label?.toLowerCase() === map.label.toLowerCase()
      )

      if ( remapFind ) {
        control.keyCode = remapFind.keyCode
        control.keyName = remapFind.keyName
      } else {
        control.keyName = ''
        control.keyCode = -1 // prevent matching
      }
    })
  }

  dropLastDrag($event: DragEvent) {
    const lastDrag = this.lastDrag
    const startOffsetX = lastDrag?.startOffsetX || 0
    const startOffsetY = lastDrag?.startOffsetY || 0
    
    // new position is based off screen so we need to calculate using where we came from
    const offsetX = $event.offsetX - startOffsetX
    const offsetY = $event.offsetY - startOffsetY
    
    const target = $event.target as Element
    const dropWidth = target.clientWidth
    const dropHeight = target.clientHeight
    const widthPercent = offsetX / dropWidth * 100
    const heightPercent = offsetY / dropHeight * 100

    if ( lastDrag ) {
      const players = this.platform.players
      const controls = players[ this.playerIndex ]
      const found = controls.find(x => x === lastDrag.control)
      let control = lastDrag.control

      if ( !found ) {
        control = JSON.parse(JSON.stringify(lastDrag.control)) // clone from another place
        controls.push(control) // paste from another place
      }

      control.x = widthPercent
      control.y = heightPercent
    }

  }

  toggleLastDrag(
    control: Control,
    $event: DragEvent | MouseEvent
  ): Control | undefined {
    if ( this.controlListen ) {
      return // ignore because a double click to listen was started
    }

    if ( this.lastDrag?.control === control ) {
      delete this.lastDrag
      this.lastDragChange.emit()
      return
    }

    this.setLastDrag(control, $event)
    return control
  }
  
  setLastDrag(control: Control, $event: DragEvent | MouseEvent) {
    this.lastDragChange.emit(this.lastDrag={
      control:control,
      startOffsetY:$event.offsetY,
      startOffsetX:$event.offsetX
    })
  }
}

export class LastDrag {
  // event!: DragEvent
  control!: Control
  startOffsetY!: number
  startOffsetX!: number
}

export interface Remap {
  keyName: string // instead use this of default string
  keyCode: number // instead use this default number
  label: string // match by name here 'Start' === 'start'
}