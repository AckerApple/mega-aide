import { Component } from '@angular/core'
import { LastPress, LastPresses } from './LastPresses.provider'
import { Subscription } from 'rxjs'
import { SessionProvider } from '../session.provider'
import { Control, PlatformMap } from '../platforms'

interface PressMap {
  platform: PlatformMap
  playerIndex: number
  control: Control
}

export interface PressObject {
  [code: number]: LastPress
}

interface PlayerPress {
  playerIndex: number
  pressedObject: PressObject
}

interface PlatformPress {
  platform: PlatformMap
  playerPresses: PlayerPress[]
}

@Component({
  templateUrl: './input-debug.component.html',
  providers: [ LastPresses ],
}) export class InputDebugComponent {
  viewButtonMap = false
  // controlMap = controlMap
  subs: Subscription = new Subscription()
  pressed: (LastPress & { mappings?: PressMap[] })[] = []
  platformPressed: PlatformPress[] = []

  constructor(
    public session: SessionProvider,
    public lastPresses: LastPresses,
  ) {
    this.subs.add( this.lastPresses.keyUpChange.subscribe(keyPress => {
      this.pressed = [...this.lastPresses.pressed]
      this.platformPressed = this.platformPressed.filter(platformPress => {
        platformPress.playerPresses = platformPress.playerPresses.filter(playerPress => {
          delete playerPress.pressedObject[ keyPress.which as number ]

          if ( Object.keys(playerPress.pressedObject).length < 1 ) {
            return false
          }

          return true
        })

        if ( platformPress.playerPresses.length < 1 ) {
          return false
        }

        return true
      })
    }))
    
    this.subs.add( this.lastPresses.keyDownChange.subscribe(_keyPress => {
      this.pressed = [...this.lastPresses.pressed]
      this.pressed.forEach(keyPress => {
        this.session.platformMap.images.forEach(platform => {
          platform.players.forEach((player, playerIndex) => {
            player.forEach(control => {
              if ( control.keyCode === keyPress.code ) {
                let platformPress = this.platformPressed.find(pp => pp.platform === platform) as PlatformPress
                if ( !platformPress ) {
                  this.platformPressed.push(platformPress = { platform: platform, playerPresses: [] })
                }
                
                let playerPress = platformPress.playerPresses.find(playerPress => playerPress.playerIndex === playerIndex) as PlayerPress
                if ( !playerPress ) {
                  platformPress.playerPresses.push(playerPress = { playerIndex, pressedObject: {} })
                }

                // set object map
                playerPress.pressedObject[control.keyCode as number] = keyPress

                keyPress.mappings = keyPress.mappings || []
                
                if ( keyPress.mappings.find(map => map.control === control) ) {
                  return // already in array
                }
                
                keyPress.mappings.push({
                  platform, playerIndex, control
                })
              }
            })
          })
      })
      })
    }))
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
}
