import { Component } from '@angular/core'

@Component({
  templateUrl: './gamepads.component.html',
})
export class GamepadsComponent {
  // gamepads: Record<string, Gamepad> = {}
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

        this.gamepads[index] = gamepad
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
}

export function getReadyGamepads(): Gamepad[] {
  const gamepads = navigator.getGamepads().filter(gamepad => gamepad) as Gamepad[]
  // const gamepads = navigator.getGamepads() as Gamepad[]
  return gamepads
}
