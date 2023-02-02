import { EventEmitter, Injectable } from "@angular/core"

@Injectable() export class LastPresses {
  pressedObject: PressedObject = {} // currently pressed in object format
  pressed: LastPress[] = [] // actively pressed
  pastPressArray: LastPress[] = [] // last 5
  onKeyUp = (event: KeyboardEvent): void => this.keyUp(event)
  onKeyDown = (event: KeyboardEvent): void => this.keyDown(event)
  keyDownChange = new EventEmitter<LastPress>()
  keyUpChange = new EventEmitter<LastPress>()
  
  constructor() {
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('keydown', this.onKeyDown)
  }

  ngOnDestroy(){
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('keydown', this.onKeyDown)
  }

  keyUp = (event: KeyboardEvent) => {
    // event.preventDefault()
    this.unpressKeyCode(event.keyCode)

    switch (event.keyCode) {
      case 18: // alt
        switch (event.location) {
          case 1: // left
            this.unpressKeyCode(164)
            break
          case 2: // right
            this.unpressKeyCode(165)
            break
        }
        break

      case 16: // shift
        switch (event.location) {
          case 1: // left
            this.unpressKeyCode(160)
            break
          case 2: // right
            this.unpressKeyCode(161)
            break
        }
        break

      case 17: // control
        switch (event.location) {
          case 1: // left
            this.unpressKeyCode(162)
            break
          case 2: // right
            this.unpressKeyCode(163)
            break
        }
        break
    }
  }

  unpressKeyCode(keyCode: number) {
    delete this.pressedObject[ keyCode ]
    const index = this.pressed.findIndex(press => press.code === keyCode)
    const key = this.pressed[index]
    this.pressed.splice(index, 1)
    this.keyUpChange.emit(key)
  }
  
  keyDown = (event: KeyboardEvent) => {
    // event.preventDefault()
    const code: string = event.code // what string ref indicates what was pushed
    const keyCode: number = event.keyCode // what number indicates what was pushed

    const meta: LastPress = {
      which: event.which,
      code: keyCode, // number
      key: code, // string
    }
    
    this.press(meta)

    switch (keyCode) {
      case 18: // alt
        switch (event.location) {
          case 1:
            this.press({ which: 164, code: 164, key: code })
            break;
          case 2:
            this.press({ which: 165, code: 165, key: code })
            break;
        
          default:
        }
        break

      case 16: // shift
        switch (event.location) {
          case 1:
            this.press({ which: 160, code: 160, key: code })
            break;
          case 2:
            this.press({ which: 161, code: 161, key: code })
            break;
        
          default:
        }
        break
    
      case 17: // control
        switch (event.location) {
          case 1: // left
            this.press({ which: 162, code: 162, key: code })
            break

          case 2: // right
            this.press({ which: 163, code: 163, key: code })
            break
        }
        break
    }
  }

  press(meta: LastPress) {
    const keyCode = meta.code as number
    this.pressedObject[keyCode] = meta
    
    // prevent double recording
    if ( !this.pastPressArray.find(press => press.code === meta.code) ) {
      this.pastPressArray.unshift(meta)
      
      if ( this.pastPressArray.length > 5 ) {
        this.pastPressArray.length = 5
      }  
    }
    
    // prevent double recording
    if ( !this.pressed.find(press => press.code === meta.code) ) {
      this.pressed.push(meta)
      this.keyDownChange.emit(meta)
    }
  }
}

export interface PressedObject {
  [code: number]: LastPress | undefined
}

export class LastPress {
  which?: number
  code?: number
  key?: string
}
