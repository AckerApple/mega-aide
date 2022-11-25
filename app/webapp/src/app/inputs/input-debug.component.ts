import { Component } from '@angular/core'
import { LastPress, LastPresses } from './LastPresses.provider'
import { Subscription } from 'rxjs'
import { SessionProvider } from '../session.provider'
import { Control, PlatformMap } from '../platforms'
import windowsKeys from './windowsKeys.json'

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

interface Pressed extends LastPress {
  mappings?: PressMap[]
}

@Component({
  templateUrl: './input-debug.component.html',
  providers: [ LastPresses ],
}) export class InputDebugComponent {
  windowsKeys = windowsKeys
  keysMapped: Pressed[] = []
  viewButtonMap = false
  // controlMap = controlMap
  subs: Subscription = new Subscription()
  pressed: Pressed[] = [] // <table> driven data
  platformPressed: PlatformPress[] = [] // visual controller display of matches

  constructor(
    public session: SessionProvider,
    public lastPresses: LastPresses,
  ) {
    // remove previous press maps
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
    
    // convert keypress into game platform control matches
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

    console.log('this.windowsKeys', this.windowsKeys)
    this.windowsKeys.map(map => {
      const platformControls = this.getPlatformControlsByPressCode(map.num)
      
      platformControls.forEach(item => {
        const findIndex = this.keysMapped.findIndex(key => map.num === key.code)
        if ( findIndex >= 0 ) {
          this.keysMapped[findIndex].mappings?.push( item )
          return
        }
        
        const pressedObject: Pressed = {
          which: map.num,
          code: map.num,
          key: map.code,
          mappings: [ item ]
        }

        this.keysMapped.push(pressedObject)
      })
    })
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
  
  getPlatformControlsByPressCode(keyPressCode: number): PressMap[] {
    const matches: PressMap[] = []
    
    this.session.platformMap.images.forEach(platform => {
      platform.players.forEach((player, playerIndex) => {
        player.forEach(control => {
          if ( control.keyCode === keyPressCode ) {
            matches.push({control, platform, playerIndex})
          }
        })
      })
    })

    return matches
  }
}
