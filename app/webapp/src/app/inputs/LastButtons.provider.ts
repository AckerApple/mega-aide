import { EventEmitter, Injectable } from "@angular/core"
import { getReadyGamepads } from "../gamepads.component"

export type LastButton = string | number // buttons: 0-15 or axis: -0 | +0 | -1 | +1

export interface LastButtons {
  [buttonOrAxis: LastButton]: {
    id: string // gamepad id
    code: LastButton
  }
}

@Injectable() export class LastButtonsProvider {
  pressedObject: LastButtons = {} // currently pressed in object format
  pressed: LastButton[] = [] // actively pressed
  pastPressArray: LastButton[] = [] // last 5
  buttonListenInterval?: any

  buttonPress: EventEmitter<number> = new EventEmitter()
  axisPress: EventEmitter<string> = new EventEmitter()

  listening: boolean = false
  listeningChange: EventEmitter<boolean> = new EventEmitter()

  ngOnDestroy(){
    this.removeListeners()
  }

  toggleListening() {
    if ( this.buttonListenInterval ) {
      this.removeListeners()
    } else {
      this.startListening()
    }
  }

  startListening() {
    clearInterval( this.buttonListenInterval )
    const gamepadsBeforeStart: EditableGamepad[] = editableGamepads(getReadyGamepads())
    
    this.buttonListenInterval = setInterval(() => {
      navigator.getGamepads().forEach(gamepad => {
        if ( !gamepad ) {
          return
        }

        let match = gamepadsBeforeStart.find(before => before.id === gamepad.id)
        
        if ( !match ) {
          match = editableGamepad(gamepad)
          gamepadsBeforeStart.push(match) // it's a new gamepad
        } else if ( match.timestamp === gamepad.timestamp ) {
          return // has not changed
        }

        // detect by button press
        gamepad.buttons.forEach((button, index) => {
          if ( button.pressed ) {
            this.pressButton(index, gamepad)
          } else {
            this.depress(index, gamepad)
          }
        })

        // detect by axis press
        gamepad.axes.forEach((xy, index) => {
          const negative = gamepad.axes[index] === -1
          const axis = (negative ? '-' : '+') + index
          const opposite = (negative ? '+' : '-') + index
          const pressed = xy === 1 || xy === -1

          if ( pressed ) {
            this.pressAxis(axis, gamepad)
            this.depress(opposite, gamepad)
          } else {
            this.depress(axis, gamepad)
            this.depress(opposite, gamepad)
          }

          if ( negative ) {}
        })

        // update ongoing gamepad record
        match.timestamp = gamepad.timestamp
      })
    }, 50)

    this.listeningChange.emit(this.listening=true)
  }
  
  pressAxis(axis: string, gamepad: Gamepad) {
    this.axisPress.emit( axis )
    this.recordPress( axis, gamepad )
  }

  pressButton(buttonIndex: number, gamepad: Gamepad) {
    this.buttonPress.emit( buttonIndex )
    this.recordPress( buttonIndex, gamepad )
  }

  recordPress(
    code: string | number,
    gamepad: Gamepad
  ) {
    this.pressedObject[code] = {
      code, id: gamepad.id,
    }

    if ( !this.pastPressArray.includes(code) ) {
      this.pastPressArray.unshift(code)
      
      if ( this.pastPressArray.length > 5 ) {
        this.pastPressArray.length = 5
      }
    }

    if ( !this.pressed.includes(code) ) {
      this.pressed.push(code)
    }
  }

  depress(press: string | number, gamepad: Gamepad) {
    if ( this.pressedObject[press]?.id === gamepad.id ) {
      delete this.pressedObject[press]

      const index = this.pressed.indexOf(press)
      if ( index >= 0 ) {
        this.pressed.splice(index, 1)
      }
    }
  }

  removeListeners() {
    clearInterval( this.buttonListenInterval )
    delete this.buttonListenInterval
    this.listeningChange.emit( this.listening=false )
  }
}


function editableGamepads(gamepads: Gamepad[]): EditableGamepad[] {
  return gamepads.map(gamepad => editableGamepad(gamepad))
}

function editableGamepad(gamepad: Gamepad): EditableGamepad {
  // return JSON.parse(JSON.stringify(getReadyGamepads()))
  return {
    axes: gamepad.axes,
    buttons: gamepad.buttons,
    connected: gamepad.connected,
    hapticActuators: gamepad.hapticActuators,
    id: gamepad.id,
    index: gamepad.index,
    mapping: gamepad.mapping,
    timestamp: gamepad.timestamp,
  }
}

type EditableGamepad = Omit<Gamepad, 'timestamp'> & {timestamp: number}