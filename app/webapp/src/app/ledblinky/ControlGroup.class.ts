import { BehaviorSubject, combineLatest, from, map, mergeMap, Observable, shareReplay } from "rxjs"
import { LedBlinky } from "./LedBlinky.class"
import { PlayerControl } from "./PlayerControl.class"
import { LightAndControl } from "./LightAndControl.interface"
import { NewPlayer, Player, PlayerDetails } from "./Player.class"
import { XmlDetails } from "./XmlDetails.class"
import { createElement } from "../launchbox/games.utils"
import { ledColorNameToCss, ledNumberedColorToCss, rgbNum } from "./LedBlinky.utils"
import { EmulatorDetails, NewEmulator } from "./Emulator.class"
import { paramRomElm } from "./rom-controls.component"
import { ShareControl } from "./rom-display.component"
import { hexToRgb } from "../inputs/platform.utils"

/* <controlGroup> also known as ROM */
export interface ControlGroupDetails {
  groupName: string
  voice?: string
  
  defaultActive?: string | null
  defaultInactive?: string | null
  
  numPlayers?: string // ="1"
  
  alternating?: string // ="0"
  jukebox?: string // ="0"
  ledwizGlobalPulse?: string // ="3"
  
  [index: string]: string | null | undefined
}

// <controlGroup> also known as ROM
export class NewControlGroup {
  constructor(
    public emulator: NewEmulator,
    public players: NewPlayer[],
    public ledBlinky: LedBlinky
  ) {
    // this.updated$.next()
  }
  
  // includes init
  updated$ = new BehaviorSubject<null>(null)
  // updated$ = new Subject<void>()

  xml = new XmlDetails(
    {} as ControlGroupDetails,
    createElement('controlGroup'),
  )

  defaultActiveCss$: Observable<string> = combineLatest([
    this.ledBlinky.curve$,
    this.ledBlinky.colors$,
    this.xml.details$, // when details change, redraw me
  ]).pipe(
    map(([curve, colorRgbConfig]) => {
      if ( !this.xml.details.defaultActive ) {
        return ''
      }

      const isNumbered = this.xml.details.defaultActive.includes(',')
      if ( isNumbered ) {
        return ledNumberedColorToCss(this.xml.details.defaultActive, curve)
      }
      
      return ledColorNameToCss(this.xml.details.defaultActive, colorRgbConfig)
    })
  )

  defaultInactiveCss$: Observable<string> = combineLatest([
    this.ledBlinky.curve$,
    this.ledBlinky.colors$,
    this.xml.details$, // when details change, redraw me
  ]).pipe(
    map(([curve, colorRgbConfig]) => {
      if ( !this.xml.details.defaultInactive ) {
        return ''
      }

      const color = this.xml.details.defaultInactive
      const isNumbered = this.xml.details.defaultInactive.includes(',')
      const cssColor = isNumbered ? ledNumberedColorToCss(this.xml.details.defaultInactive, curve) : ledColorNameToCss(color, colorRgbConfig)
      return cssColor
    })
  )

  setDefaultActiveToCssColor(cssColor: string) {
    if ( !cssColor ) {
      return
    }

    const noHashValue = cssColor.replace('#','')
    const defaultActive = hexToRgb(noHashValue).map(rgbNum).join(',')
    this.xml.addDetails({defaultActive}) // cause emit and save
  }

  setDefaultActiveToColor(color: string) {
    const isCommaNumbers = color.split(',').every(x => !isNaN(Number(x)))
    if ( isCommaNumbers ) {
      this.xml.addDetails({defaultActive: color})
      return
    }
    
    this.setDefaultActiveToCssColor(color)
  }

  setDefaultInactiveToColor(color: string) {
    const isCommaNumbers = color.split(',').every(x => !isNaN(Number(x)))
    if ( isCommaNumbers ) {
      this.xml.addDetails({defaultInactive: color})
      return
    }
    
    this.setDefaultInactiveToCssColor(color)
  }

  setDefaultInactiveToCssColor(cssColor: string) {
    if ( !cssColor ) {
      return
    }

    const noHashValue = cssColor.replace('#','')
    const defaultInactive = hexToRgb(noHashValue).map(rgbNum).join(',')
    this.xml.addDetails({defaultInactive}) // cause emit and save
  }

  paramPlayerByIndex(playerIndex: number) {
    const player = this.players.find(player => player.playerIndex === playerIndex)
    if ( player ) {
      return this.players[playerIndex]
    }

    while(this.players.length <= playerIndex) {
      this.addPlayer()
    }

    return this.players[playerIndex]
  }

  getControlCount() {
    return this.getAllControls().length
  }

  getAllControls() {
    return this.players.reduce((all,player) => {
      all.push( ...player.controls )
      return all
    }, <PlayerControl[]>[])
  }

  // used for <controls-layouts> and updated whenever new details come in
  romControlLights$: Observable<LightAndControl[]> = this.updated$.pipe(
    mergeMap(() => this.ledBlinky.marryControlsToLights$(this)),
    shareReplay(1),
  )

  romRealControlLights$ = this.romControlLights$.pipe(
    map(romControlLights => romControlLights.filter(romControlLight => romControlLight.control.xml.element.parentNode?.parentNode)),
    shareReplay(1),
  )

  addPlayer(): NewPlayer {
    const controls: PlayerControl[] = []
    const details: PlayerDetails = {
      number: this.players.length.toString()
    }
  
    const playerIndex = this.players.length
    const player = new Player(
      details,
      this,
      controls,
      playerIndex,
      createElement('player'),
      this.ledBlinky,
    )

    // add player element to rom element
    this.players.push(player)
    
    const romElement = paramRomElm( this )
    romElement.appendChild( player.xml.element )
    
    this.xml.addDetails({numPlayers: playerIndex.toString()})
    return player
  }

  getJsonShareFormat() {
    const details = this.xml.details
    const shareFormat = {
      gn: details.groupName,
      v: details.voice,
      np: details.numPlayers,
      a: details.alternating,
      j: details.jukebox,

      e: this.emulator.xml.details,
      
      // players
      p: this.players.map(player => {
        const data = {
          n: player.xml.details.number,
          
          // controls
          c: player.controls.map(control => {
            const c = [
              control.xml.details.name || '', // n: 
              control.xml.details.inputCodes || '', // ic:
              control.xml.details.color || '', // c: 
              {
                v: control.xml.details.voice,
                p: control.xml.details.primaryControl,
                a: control.xml.details.alwaysActive,
              }
            ] as ShareControl

            if ( !c[3].v ) {
              delete c[3].v
            }

            if ( !c[3].p || c[3].p==='0' ) {
              delete c[3].p
            }

            if ( !c[3].a || c[3].a==='0' ) {
              delete c[3].a
            }

            if ( !Object.keys(c[3]).length ) {
              c.splice(3,1)
            }

            return c
          })
        }

        return cleanseObject(data)
      })
    }

    return cleanseObject(shareFormat)
  }

  // use decodeShareFormat
  getUrlShareString() {
    const string = JSON.stringify( this.getJsonShareFormat() )

    const keyTrim = string
      .replace(/"([0-9]+)"/g, '$1') // quoted numbers to just number
      .replace(/"([^"]+)":/g, '$1:') // remove quotes on keys
      
      const encoded = keyTrim
      .replace(/!/g, '..0') // real !
      .replace(/\(/g, '..1') // real (
      .replace(/\)/g, '..2') // real )
      .replace(/"\],\["P/g, '.0')
      .replace(/","/g, '.1')
      .replace(/"},{/g, '.2')
      .replace(/:\[{/g, '.3')
      .replace(/MOUSE/g, '.4')
      .replace(/KEYCODE_/g, '.5')
      .replace(/_BUTTON/g, '.6')
      .replace(/","\.5/g, '.7')
      .replace(/\.1\.5/g, '.8')
      // .9 is at bottom
      .replace(/,/g, '~')
      .replace(/"/g, '\'')
      .replace(/:/g, '*')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/{/g, '!')
      .replace(/}/g, '!0')
      .replace(/ /g, '!1')
      .replace(/'\)~\('START/g, '.9')

    return encoded
  }

  /** Get link worthy format of controls */
  getUrlShareFormat() {
    const encoded = this.getUrlShareString()
    return encodeURIComponent(encoded)
  }

  getUrlShareIssues(): Issue[] {
    const string = JSON.stringify( this.getJsonShareFormat() )
    const issues: {description: string}[] = []

    const hasExchange = string.search(/\.[^0-9]/)
    if ( hasExchange >= 0 ) {
      issues.push({
        description: 'This ROMs export data contains a period and then a number. Cannot share due to encoding logic. Please change ROM data and try again.',
      })
    }

    ['*','\'','~'].forEach(char => {
      if ( string.includes(char) ) {
        issues.push({
          description: `This ROMs export data contains a ${char} character and that is a special export character. Sorry cannot share this ROM, at this time. Please change ROM data and try again.`,
        })  
      }
    })

    return issues
  }
}

// <controlGroup> also known as ROM
export class ControlGroup extends NewControlGroup {
  constructor(
    public override emulator: NewEmulator,
    public override players: NewPlayer[],
    public override ledBlinky: LedBlinky,
  ) {
    super(emulator, players, ledBlinky)
  }
}

function cleanseObject(obj: { [key: string]: any }): { [key: string]: any } {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Input must be an object');
  }

  const cleansedObj: { [key: string]: any } = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== '' && obj[key] !== undefined && (!(obj[key] instanceof Array) || obj[key].length)) {
      cleansedObj[key] = obj[key];
    }
  }

  return cleansedObj;
}

export interface Issue {
  description: string
}

export interface ShareRomFormat {
  gn: string // details.groupName,
  v?: string //  details.voice,
  np: string // details.numPlayers,
  a?: string // details.alternating,
  j?: string // details.jukebox,

  e: EmulatorDetails// this.emulator.xml.details,
    
  // players
  p: {
    n: string // player.xml.details.number,
    
    // controls
    c: ShareControl
  }[]

}