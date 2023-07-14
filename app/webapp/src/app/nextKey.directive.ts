import { Directive, EventEmitter, HostListener, Input, Output, SimpleChanges } from '@angular/core'

@Directive({
  selector: "[nextKey]",
  exportAs: "nextKey"
})
export class NextKeyDirective {
  @Input() startByEvent?: 'click' | 'dblclick' | 'contextmenu'
  @Input() nextKey?: string
  @Output() nextKeyChange: EventEmitter<string> = new EventEmitter()
  
  @Input() nextKeyCode?: number
  @Output() nextKeyCodeChange: EventEmitter<number> = new EventEmitter()
  
  @Input('nextKeyListening') listening: boolean | number | undefined
  @Output('nextKeyListeningChange') listeningChange: EventEmitter<boolean> = new EventEmitter()

  onKeyDownHandler: (event: KeyboardEvent) => any

  constructor(){
    this.onKeyDownHandler = (event) => this.onKeyDown(event)
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
    window.addEventListener('keydown', this.onKeyDownHandler)
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
    window.removeEventListener('keydown', this.onKeyDownHandler)
    this.listeningChange.emit(this.listening = false)
  }

  onKeyDown(event: KeyboardEvent) {
    event.preventDefault()
    this.stop()
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
