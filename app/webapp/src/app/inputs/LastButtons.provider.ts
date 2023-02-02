import { EventEmitter, Injectable } from "@angular/core"
import { getReadyGamepads } from "./gamepads.component"

export type LastButton = string | number // buttons: 0-15 or axis: -0 | +0 | -1 | +1

export interface LastButtons {
  [buttonOrAxis: LastButton]: {
    id: string // gamepad id
    code: string // LastButton (ie: 0,1,2,LeftStickX-1)
    gamepadIndex: number
  }
}

@Injectable() export class LastButtonsProvider {
  gamepads: EditableGamepad[] = editableGamepads( navigator.getGamepads().filter(x => x) as Gamepad[] ) // all avail
  activeGamepads: EditableGamepad[] = [...this.gamepads] // filtered
  
  pressedObject: LastButtons = {} // currently pressed in object format
  pressed: LastButton[] = [] // actively pressed
  pastPressArray: LastButton[] = [] // last 5
  buttonListenInterval?: any

  buttonPress: EventEmitter<number> = new EventEmitter()
  axisPress: EventEmitter<string> = new EventEmitter()

  listening: boolean = false
  listeningChange: EventEmitter<boolean> = new EventEmitter()
  gameIndex?: number
  eventHandlers: {handler: (any: any) => any, eventName: string}[] = []

  constructor(){
    this.subscribeToWindow()
  }

  ngOnDestroy(){
    this.removeListeners()
    this.eventHandlers.forEach(eh => 
      window.removeEventListener(eh.eventName, eh.handler)
    )
  }

  subscribeToWindow() {
    const connected = (e: GamepadEvent) => this.addGamepad(e.gamepad)
    const disconnected = (e: GamepadEvent) => this.removeGamepad(e.gamepad)
    
    window.addEventListener('gamepadconnected', connected, false)
    window.addEventListener('gamepaddisconnected', disconnected, false)
    
    this.eventHandlers.push({handler: connected, eventName: 'gamepadconnected'})
    this.eventHandlers.push({handler: disconnected, eventName: 'gamepaddisconnected'})
  }

  removeGamepad(gamepad: Gamepad) {
    let index = this.gamepads.findIndex(x => gamepadsMatch(x, gamepad))
    if ( index >= 0 ) {
      this.gamepads.splice(index, 1)
    }

    index = this.activeGamepads.findIndex(x => gamepadsMatch(x, gamepad))
    if ( index >= 0 ) {
      this.activeGamepads.splice(index, 1)
    }
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
    this.gamepads.length = 0
    this.activeGamepads.length = 0
    
    this.buttonListenInterval = setInterval(() =>
      this.evaluateState()
    , 50)

    this.listeningChange.emit(this.listening=true)
  }

  evaluateState() {
    const navGamepads = getReadyGamepads()
      
    navGamepads.filter(gamepad => {
      if ( !gamepad ) {
        return
      }

      let activeMatchIndex = this.activeGamepads.findIndex(before => before.id === gamepad.id)
      
      if ( activeMatchIndex < 0 ) {
        activeMatchIndex = this.addGamepad(gamepad)
        
        if ( activeMatchIndex < 0 ) {
          return // it was not meant to be added (maybe filtered)
        }
      } else if ( this.activeGamepads[activeMatchIndex].timestamp === gamepad.timestamp ) {
        return gamepad // has not changed
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
        const value = gamepad.axes[index]

        if ( this.activeGamepads[activeMatchIndex].axes[index] === value ) {
          return // break out, it's the same value as before
        }

        const negative = value === -1
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
      })

      // update ongoing gamepad record
      Object.assign(this.activeGamepads[activeMatchIndex], editableGamepad(gamepad))
      
      const matchIndex = this.gamepads.findIndex(before => before.id === gamepad.id)
      Object.assign(this.gamepads[matchIndex], editableGamepad(gamepad))

      return gamepad
    }) as Gamepad[]
  }

  /** adds to this.gamepads and this.activeGamepads if not already there */
  addGamepad(
    gamepad: Gamepad
  ): number {
    if ( !this.gamepads.find(x => gamepadsMatch(x, gamepad)) ) {
      this.gamepads.push(editableGamepad(gamepad)) // update recording of all gamepads
    }

    if ( this.gameIndex !== undefined && gamepad.index !== this.gameIndex ) {
      return -1 // ignore, we only focus on one controller
    }

    const match = editableGamepad(gamepad)
    match.axes = [] // ensure fresh access that can't be compared
    const matchIndex = this.activeGamepads.length
    this.activeGamepads.push(match) // it's a new gamepad
    return matchIndex
  }
  
  pressAxis(axis: string, gamepad: Gamepad) {
    this.axisPress.emit( axis )
    this.recordPress(axis, gamepad)
  }

  pressButton(buttonIndex: number, gamepad: Gamepad) {
    this.buttonPress.emit( buttonIndex )
    this.recordPress(buttonIndex.toString(), gamepad )
  }

  recordPress(
    code: string,
    gamepad: Gamepad
  ) {
    // do we already have a press by another controller?
    const current = this.pressedObject[code]
    if ( current && current.gamepadIndex != gamepad.index) {
      const stillValidGamepad = this.gamepads.find(x => x.id === current.id && x.index === current.gamepadIndex)
      if ( stillValidGamepad ) {
        return // do not override current press
      }
    }

    this.pressedObject[code] = {
      code, id: gamepad.id,
      gamepadIndex: gamepad.index
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
    const compare = this.pressedObject[press]
    if ( compare && compare.id === gamepad.id && compare.gamepadIndex === gamepad.index ) {
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

  /** only listen to specific gamepad events. Will start listening if not already */
  setGameIndex(gameIndex?: number | 'all') {
    // listen if not already
    if ( !this.buttonListenInterval ) {
      this.startListening()
    }

    const num = Number(gameIndex)
    if ( num === -1 ) {
      delete this.gameIndex
      this.activeGamepads.length = 0
      this.activeGamepads.push(...this.gamepads)
      return
    }
    
    Object.entries(this.pressedObject).forEach(([key, value]) => {
      if ( value.gamepadIndex !== num ) {
        delete this.pressedObject[key]
      }
    })
    
    this.pressed.length = 0
    this.gameIndex = num

    const limited = this.gamepads.filter(gamepad => gamepad.index === num)
    this.activeGamepads.length = 0
    this.activeGamepads.push(...limited)
  }
}

function editableGamepads(gamepads: Gamepad[]): EditableGamepad[] {
  return gamepads.map(gamepad => editableGamepad(gamepad))
}

function editableGamepad(gamepad: Gamepad): EditableGamepad {
  // return JSON.parse(JSON.stringify(getReadyGamepads()))
  return {
    axes: gamepad.axes.map(x => x), // convert from readonly
    buttons: gamepad.buttons,
    connected: gamepad.connected,
    hapticActuators: gamepad.hapticActuators,
    id: gamepad.id,
    index: gamepad.index,
    mapping: gamepad.mapping,
    timestamp: gamepad.timestamp,
  }
}

type EditableGamepad = Omit<Gamepad, 'timestamp,axes'> & {
  timestamp: number
  axes: number[]
}

function gamepadsMatch(x: Gamepad, gamepad: Gamepad) {
  return x.id === gamepad.id && x.index === gamepad.index
}
