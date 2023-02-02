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
  templateUrl: './keyboard.component.html',
  providers: [ LastPresses ],
}) export class KeyboardComponent {
  platformFilter?: string // platform.label
  windowsKeys = windowsKeys
  keysMapped: Pressed[][] = [[]]
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
      if ( !keyPress ) {
        this.session.warn('Invalid keyPress', keyPress)
        return
      }

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
        this.session.platforms.images.forEach(platform => {

          if ( this.platformFilter && this.platformFilter !== platform.label ) {
            return // requested to be filtered out
          }

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

    this.windowsKeys.map(map => {
      const platformControls = this.getPlatformControlsByPressCode(map.num)
      
      platformControls.forEach(item => {
        let childIndex= -1
        
        const findIndex = this.keysMapped.findIndex(group => {
          const findIndex = group.findIndex(key => map.num === key.code)

          if ( findIndex >= 0 ) {
            childIndex = findIndex
            return true
          }

          return false
        })

        if ( findIndex >= 0 ) {
          this.keysMapped[findIndex][childIndex].mappings?.push( item )
          return
        }
        
        const pressedObject: Pressed = {
          which: map.num,
          code: map.num,
          key: map.code,
          mappings: [ item ]
        }

        this.keysMapped.find((map, index) => {
          if ( map.length === 5 ) {
            if ( index === this.keysMapped.length-1 ) {
              this.keysMapped.push([])
            }
            return false
          }

          this.keysMapped[index].push(pressedObject)

          return true
        })
      })
    })
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
  
  getPlatformControlsByPressCode(keyPressCode: number): PressMap[] {
    const matches: PressMap[] = []
    
    this.session.platforms.images.forEach(platform => {
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
