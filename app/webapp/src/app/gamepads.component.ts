import { Component } from '@angular/core'

@Component({
  templateUrl: './gamepads.component.html',
})
export class GamepadsComponent {
  // gamepads: Record<string, Gamepad> = {}
  gamepads: (null | Gamepad)[] = []
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
      gamepads.forEach((gamepad, index) => {

        const match = this.gamepads[index]
        if ( !match ) {
          return // not found (maybe we should connect?)
        }

        if ( match.timestamp === gamepad.timestamp ) {
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
    index = index === undefined ? gamepad?.index : index
    if (connecting) {
      // check if we already have and update
      const existingEntry = this.gamepads.findIndex(value => value && value.id === gamepad.id && value.index === gamepad.index)
      if ( existingEntry >= 0) {
        delete this.gamepads[ existingEntry ]
      }

      this.gamepads[index] = gamepad
      return gamepad
    }
    
    delete this.gamepads[index]
    return gamepad
  }  
}

export function getReadyGamepads(): Gamepad[] {
  return navigator.getGamepads() as Gamepad[]
  // return navigator.getGamepads().filter(gamepad => gamepad) as Gamepad[]
}
