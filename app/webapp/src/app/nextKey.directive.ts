import { Directive, EventEmitter, HostListener, Input, Output } from '@angular/core'

@Directive({
  selector: "[nextKey]"
})
export class NextKeyDirective {
  @Input() startByEvent?: 'click' | 'dblclick' | 'contextmenu'
  @Input() nextKey?: string
  @Output() nextKeyChange: EventEmitter<string> = new EventEmitter()
  
  @Input() nextKeyCode?: number
  @Output() nextKeyCodeChange: EventEmitter<number> = new EventEmitter()
  
  @Input() nextKeyListening?: boolean | number
  @Output() nextKeyListeningChange: EventEmitter<boolean> = new EventEmitter()

  onKeyDownHandler: (event: KeyboardEvent) => any

  constructor(){
    this.onKeyDownHandler = (event) => this.onKeyDown(event)
  }

  ngOnChanges( changes:any ){
    if ( changes.nextKeyListening ) {
      if ( !this.nextKeyListening ) {
        this.removeListeners()
      } else {
        this.startListening()
      }
    }
  }

  ngOnDestroy(){
    this.removeListeners()
  }

  toggleListen() {
    if ( this.nextKeyListening ) {
      this.removeListeners()
    } else {
      this.startListening()
    }
  }

  startListening() {
    window.addEventListener('keydown', this.onKeyDownHandler)
    this.nextKeyListeningChange.emit(this.nextKeyListening=true)
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

  removeListeners() {
    window.removeEventListener('keydown', this.onKeyDownHandler)
    this.nextKeyListeningChange.emit(this.nextKeyListening=false)
  }

  onKeyDown(event: KeyboardEvent) {
    event.preventDefault()
    this.removeListeners()
    let keyCode = event.keyCode

    switch (keyCode) {
      // switch generic keys number for Windows key number
      case 18: // alt
        switch (event.location) {
          case 1: // left
            keyCode = 164
            break
          case 2: // right
            keyCode = 165
            break
        }
        break;

      case 16: // control
        switch (event.location) {
          case 1: // left
            keyCode = 160
            break
          case 2: // right
            keyCode = 161
            break
        }
        break;

      case 17: // control
        switch (event.location) {
          case 1: // left
            keyCode = 162
            break
          case 2: // right
            keyCode = 163
            break
        }
        break
    }

    this.nextKeyCodeChange.emit(this.nextKeyCode=keyCode)
    this.nextKeyChange.emit(this.nextKey=event.code)
    //which: event.which,
    //key: event.key,
  }
}
