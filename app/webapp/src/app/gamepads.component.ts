import { Component } from '@angular/core'

interface GamepadMeta {
  // is8Way?: boolean
  debug?: boolean
  json: string
}

@Component({
  templateUrl: './gamepads.component.html',
})
export class GamepadsComponent {
  // gamepads: Record<string, Gamepad> = {}
  gamepadsById: {[id: string]: GamepadMeta | undefined} ={}
  gamepads: Gamepad[] = []
  eventHandlers: {eventName: keyof WindowEventMap, handler: any}[] = []
  buttonWatch?: any

  ngOnInit(){
    // set existing not null controllers
    getReadyGamepads().forEach((gamepad, index) => this.gamepadHandler(gamepad, true, index))    
    this.subscribeToWindow()
    this.listenToButtons()
  }
  
  ngOnDestroy(){
    clearInterval(this.buttonWatch)
    this.eventHandlers.forEach(x => window.removeEventListener(x.eventName, x.handler))
  }

  listenToButtons() {
    this.buttonWatch = setInterval(() => {
      const gamepads = getReadyGamepads()
      
      gamepads.forEach(gamepad => {
        const index = this.gamepads.findIndex(x => x.index === gamepad.index && x.id === gamepad.id)
        if ( index < 0 ) {
          return // not found (maybe we should connect?)
        }

        if ( this.gamepads[index].timestamp === gamepad.timestamp ) {
          return // has not changed
        }

        // a change has occurred

        this.gamepads[index] = gamepad

        if ( this.gamepadsById[gamepad.id]?.debug ) {
          this.updateGamepadJson(gamepad)
        }

        /*if ( gamepad.axes ) {
          const multipleHolds = gamepad.axes.filter(a => a >= 1 || a <= -1)
          if ( multipleHolds.length > 1 ) {
            this.setGamepad8way(gamepad)
          }
        }*/
      })
    }, 50)
  }

  subscribeToWindow() {
    const connected = (e: GamepadEvent) => this.gamepadHandler(e.gamepad, true)
    const disconnected = (e: GamepadEvent) => this.gamepadHandler(e.gamepad, false)
    
    window.addEventListener('gamepadconnected', connected, false)
    window.addEventListener('gamepaddisconnected', disconnected, false)
    
    this.eventHandlers.push({handler: connected, eventName: 'gamepadconnected'})
    this.eventHandlers.push({handler: disconnected, eventName: 'gamepaddisconnected'})
  }

  gamepadHandler(
    gamepad: Gamepad,
    connecting: boolean,
    index?: number,
  ): Gamepad {
    if ( !gamepad ) {
      return gamepad
    }

    index = index === undefined ? gamepad?.index : index
    if (connecting) {
      // check if we already have and update
      const existingEntry = this.gamepads.findIndex(value => value && value.id === gamepad.id && value.index === gamepad.index)
      if ( existingEntry >= 0) {
        this.gamepads[ existingEntry ] = gamepad
        return gamepad
      }
      
      this.gamepads.push(gamepad)
      return gamepad
    }
    
    this.gamepads.splice(index, 1) // not connecting, lets remove it
    return gamepad
  }  

  toggleGamepadDebug(gamepad: Gamepad) {
    const meta= this.updateGamepadJson(gamepad)
    meta.debug = !meta.debug
  }

  /*setGamepad8way(gamepad: Gamepad) {
    this.paramGamepadMeta(gamepad).is8Way =  true
  }*/

  paramGamepadMeta(gamepad: Gamepad): GamepadMeta {
    return this.gamepadsById[gamepad.id] = this.gamepadsById[gamepad.id] || { json: this.getGamepadJson(gamepad) }
  }

  getGamepadJson(gamepad: Gamepad): string {
    return JSON.stringify({
      axes: gamepad.axes,
      buttons: gamepad.buttons,
      connected: gamepad.connected,
      hapticActuators: gamepad.hapticActuators,
      id: gamepad.id,
      index: gamepad.index,
      mapping: gamepad.mapping,
      timestamp: gamepad.timestamp,
    },null,2)
  }

  updateGamepadJson(gamepad: Gamepad): GamepadMeta {
    const json = this.getGamepadJson(gamepad)
    
    let meta = this.gamepadsById[gamepad.id]
    
    if ( meta ) {
      meta.json = json
    } else {
      meta = this.gamepadsById[gamepad.id] = { json }
    }
    
    return meta
  }
}

export function getReadyGamepads(): Gamepad[] {
  const gamepads = navigator.getGamepads().filter(gamepad => gamepad) as Gamepad[]
  // const gamepads = navigator.getGamepads() as Gamepad[]
  return gamepads
}
