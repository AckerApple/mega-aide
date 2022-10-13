import { Component, Directive, EventEmitter, HostListener, Input, Output } from '@angular/core'
import platformMap from './platform.map.json'
import * as controlMap from './control-map.json'

@Directive({
  selector: "[nextKey]"
})
export class NextKeyDirective {
  @Input() nextKeyEvent?: 'click' | 'dblclick'
  @Input() nextKey?: string
  @Output() nextKeyChange: EventEmitter<string> = new EventEmitter()
  
  @Input() nextKeyCode?: number
  @Output() nextKeyCodeChange: EventEmitter<number> = new EventEmitter()
  
  @Input() nextKeyListening?: boolean
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

  startListening() {
    window.addEventListener('keydown', this.onKeyDownHandler)
    this.nextKeyListeningChange.emit(this.nextKeyListening=true)
  }

  @HostListener('click') onClick() {
    if ( this.nextKeyEvent && this.nextKeyEvent !== 'click' ) {
      return
    }
    this.startListening()
  }
  
  @HostListener('dblclick') onDblClick() {
    if ( this.nextKeyEvent !== 'dblclick' ) {
      return
    }
    this.startListening()
  }

  removeListeners() {
    window.removeEventListener('keydown', this.onKeyDownHandler)
    this.nextKeyListeningChange.emit(this.nextKeyListening=false)
  }

  onKeyDown(event: KeyboardEvent) {
    event.preventDefault()
    this.removeListeners()
    this.nextKeyCodeChange.emit(this.nextKeyCode=event.keyCode)
    this.nextKeyChange.emit(this.nextKey=event.code)
    //which: event.which,
    //key: event.key,
  }
}
