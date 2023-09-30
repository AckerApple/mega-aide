import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core"
import { LedBlinkyControls, getControlByElement, intToHex } from "./LedBlinky.utils"
import { routeMap as launchBoxRouteMap } from "../launchbox/launchbox.routing.module"
import { getInputCodesByLabel } from "./rom-controls.component"
import { routeMap } from "../ledblinky.routing.module"
import { SessionProvider } from "../session.provider"
import { Observable, Subscription, firstValueFrom, lastValueFrom, map } from "rxjs"
import { NewPlayer, Player } from "./Player.class"
import { createElement } from "../launchbox/games.utils"
import { PlayerControl } from "./PlayerControl.class"
import { Light } from "./Light.class"
import { ControlGuess, LightAndControl } from "./LightAndControl.interface"
import { animations } from "ack-angular-fx"
import { Issue, NewControlGroup, ShareRomFormat } from "./ControlGroup.class"
import { Emulator, EmulatorDetails } from "./Emulator.class"
import { ModalElement } from "./ModalElement"

let count = 0

@Component({
  selector: 'rom-display',
  templateUrl: './rom-display.component.html',
  animations,
}) export class RomDisplayComponent {
  uid = ++count // to ensure dialog modals are unique

  @Input() zoom?: number
  @Input() interactive = true
  @Input() layoutOnly?: boolean
  @Input() romExists = true // removes delete buttons and such
  @Input() externalFeatures = true // removes "edit layouts" and "Goto Launchbox Game"
  @Input() urlRelativeToLedBlinkyRoot!: string // relative path to LEDBlinky url root of mega-aide
  @Input() romControl!: NewControlGroup
  @Input() romControlLights$!: Observable<LightAndControl[]>

  @Input() allControls?: LedBlinkyControls | null
  @Input() emulator!: Emulator

  @Output() changed = new EventEmitter<void>()
  @Output() changedControl = new EventEmitter<PlayerControl>()

  constructor(
    public session: SessionProvider,
  ) {}


  encodedRomLink?: string
  shareRomLink?: string
  shareRomDecoded: {
    debug?: boolean
    original: string
    decoded?: DecodedRomImport
    string: string
    issues: Issue[]
  } = {original:'', string:'', issues: []}
  
  decodeSharedUrl() {
    if ( !this.shareRomLink ) {
      return
    }

    this.shareRomDecoded.original = JSON.stringify(this.romControl.getJsonShareFormat(), null, 2)
    this.shareRomDecoded.decoded = decodeShareFormat(this.shareRomLink.replace(/.*?v=[0-9]+&i=/,''))
    this.shareRomDecoded.string = this.romControl.getUrlShareString()
  }

  guessNameLightControl?: boolean

  viewXml?: boolean
  viewJson?: boolean
  
  @Input() debug?: boolean
  @Output() debugChange = new EventEmitter<boolean>()

  routeMap = routeMap
  launchBoxRouteMap = launchBoxRouteMap

  addControl: AddControl = {
    playerIndex: 0, inputCode: '', step:0, name:'', names: [], recommended: false
  }

  copyPlayer: CopyPlayer = {
    pastePlayers: [],
    couldPastePlayers: [],
  }

  romControlSub = new Subscription()
  ngOnChanges( changes:SimpleChanges ){
    if ( changes['romControl'] ) {
      this.romControlSub.unsubscribe()
      this.romControlSub = this.romControl.xml.detailsChanged$.subscribe(() => {
        this.changed.emit()
      })
    }
  }

  async loadNameRecommendations() {
    lastValueFrom(
      this.session.ledBlinky.getAverageNamesForInputCode$(
        this.addControl.inputCode,
        this.addControl.playerIndex,
      ).pipe(
        map(names => this.addControl.names = names)
      )
    )
    
    this.addControl.recommended = true
  }

  addPlayerControl(
    player: Player | NewPlayer,
    addControl?: AddControl,
  ) {
    this.addControl.step = 0
    const name = addControl?.name ? addControl.name : ''
    
    const control = getControlByElement(createElement('control'), {
      details: {
        name,
        // voice: '',
        color: 'Red',
        // primaryControl: '',
        inputCodes: addControl?.inputCode,
      },
      controls: player.controls,
      ledblinky: this.session.ledBlinky,
      player,
    }) as PlayerControl
    
    player.addControl(control)

    this.changed.emit()
    this.romControl.updated$.next(null)

    return control
  }

  onModalClose() {
    this.addControl.recommended = false
  }

  async prepareAddControlByLight(
    light: Light,
  ) {
    const details = await firstValueFrom(light.details$)
    this.addControl.step = this.addControl.step + 1
    this.addControl.playerIndex = guessPlayerIndexByName(details.name)
    this.addControl.name = ''

    const inputsMap = await firstValueFrom(this.session.ledBlinky.inputsMap$)
    const codes = getInputCodesByLabel(inputsMap, details.name)
    if ( codes.length ) {
      this.addControl.inputCode = codes[0]
    }
  }

  async lightControlChanged(
    lightControl: LightAndControl,
    romControl: NewControlGroup,
  ) {
    // const playerIndex = lightControl.playerIndex || 0
    const playerIndex = lightControl.player?.playerIndex || 0

    // If this is a first time setup
    if ( !romControl.players.length ) {
      const found = new Array(...(this.emulator.xml.element.children as any)).find(elm => elm === romControl.xml.element)
      if ( !found ) {
        console.debug(`🆕 <controlGroup groupName="${romControl.xml.details.groupName}"> Added to <emulator emuname="${this.emulator.xml.details.emuname}">`)
        this.emulator.xml.element.appendChild(romControl.xml.element)
      }
    }

    while ( playerIndex >= romControl.players.length ) {
      console.debug(`New player pushed into romControl.players ${romControl.players.length}`)
      await this.addPlayer(romControl)
    }

    const matchControl = (control: PlayerControl) => control.xml.details.name === lightControl.control.xml.details.name
    const oldPlayerIndex = romControl.players.findIndex(player => player.controls.find(matchControl))
    
    if ( lightControl.control.xml.deleted ) {
      this.changed.emit()
      return
    }

    // possibly move control to different player
    if ( oldPlayerIndex >= 0 && oldPlayerIndex != playerIndex ) {
      const oldPlayer = romControl.players[oldPlayerIndex]
      const controlOldPlayerIndex = oldPlayer.controls.findIndex(matchControl)
      oldPlayer.controls.splice(controlOldPlayerIndex, 1)
      console.debug(`Control moved from player ${oldPlayerIndex} into ${playerIndex}`)
    }

    const player = lightControl.player = romControl.players[playerIndex]
    const controls = player.controls
    const found = controls.find(matchControl)

    if ( !found ) {
      const element = lightControl.control.xml.element
      player.xml.element.appendChild( element )
      console.debug('Control pushed into player', {
        playerIndex,
        beforeLength: controls.length,
        players: romControl.players.length,
        player,
        element
      })
      // player.playerIndex = playerIndex
      controls.push(lightControl.control)
    }

    romControl.updated$.next(null)
    romControl.xml.update()
    
    this.changed.emit()
  }

  async addPlayer(romControl: NewControlGroup) {
    const player = romControl.addPlayer()
    this.copyPlayer.couldPastePlayers.push(player)
  }

  
  /** When <ledblinky-layouts (lightChanged)> then this function:
   * - figures out which control was changed by comparing to light that said it changed
   */
  async lightChanged(light: Light) {
    const controls = this.romControl
    const [ lightDetails, inputsMap ] = await Promise.all([
      firstValueFrom(light.details$),
      firstValueFrom(this.session.ledBlinky.inputsMap$),
    ])
    
    if ( !controls?.players ) {
      return // no players no work
    }

    // Convert named light into inputCodes so we can then compare game control inputCodes
    const inputCodes = getInputCodesByLabel(inputsMap, lightDetails.name)
    const colorDec = await firstValueFrom(light.colorDec$)
    // const cssValue = intToHex(colorDec)

    // build a map of just the data we need to work with
    controls.players.map(async player =>
      player.controls.map(async control => {
        const details = control.xml.details
        const localCodes = details.inputCodes?.split(',') || []
        const match = localCodes.find(localCode => inputCodes.includes(localCode))
        if ( match ) {
          const cssValue = intToHex(colorDec)
          control.edited = true
          control.updateToCssColor(cssValue)
        }
        
        return match
      })
    )
  }
  
  getPlayerIndex(
    player: NewPlayer,
    romControl: NewControlGroup,
  ) {
    return romControl.players.findIndex(x => x === player)
  }

  removePlayerControl(
    player: NewPlayer,
    romControl: NewControlGroup,
  ) {
    const index = this.getPlayerIndex(player, romControl)
    
    if ( index <= 0 ) {
      return this.session.warn('cannot delete player')
    }

    romControl.players.splice(index, 1)
  }

  copyPlayerBy(player: NewPlayer) {
    const romControl = this.romControl

    if ( !romControl ) {
      this.session.warn('failed to copy player. Expected romControl')
      return
    }

    this.copyPlayer.player = player
    this.copyPlayer.romControl = romControl
    this.copyPlayer.couldPastePlayers = [...romControl.players]
    this.copyPlayer.pastePlayers.length = 0
  }

  async completeCopyPlayer() {
    const copyPlayer = this.copyPlayer

    if ( !copyPlayer.romControl ) {
      this.session.warn('Failed to copy player. Expected copyPlayer.romControl')
      return
    }

    const fromPlayer = copyPlayer.player
    if ( !fromPlayer ) {
      this.session.warn('failed to copy player. Expected copyPlayer.player')
      return
    }

    // build list of all controls that we can use to compare against to make inputCode choices off of
    const allEmuControls = copyPlayer.romControl.emulator.controlGroups.reduce((all,controlGroup) => {
      all.push(
        ...controlGroup.controlGroups.map(controlGroup =>
          controlGroup.getAllControls()
        ).reduce((all, controls) => {
          all.push(...controls)
          return all
        }, <PlayerControl[]>[])
      )

      return all
    }, <PlayerControl[]>[])
    
    copyPlayer.pastePlayers.forEach(async paste => {
      const pastePlayer = paste.player

      if ( paste.merge ) {
        // delete matched controls
        for (let index = pastePlayer.controls.length - 1; index >= 0; --index) {
          const control = pastePlayer.controls[index]
          if ( fromPlayer.controls.find(iControl => iControl.xml.details.name === control.xml.details.name) ) {
            control.delete()
            pastePlayer.controls.splice(index, 1)
          }
        }
      } else {
        // delete all existing controls
        for (let index = pastePlayer.controls.length - 1; index >= 0; --index) {
          const control = pastePlayer.controls[index]
          control.delete()
          pastePlayer.controls.splice(index, 1)
        }
      }

      fromPlayer.controls.map(control => {
        const newDetails = {...control.xml.details}
        newDetails.inputCodes = ''
        newDetails.name = newDetails.name
          .replace(`P${fromPlayer.playerIndex}_`, `P${paste.player.playerIndex}_`)
          .replace(new RegExp(`^START${fromPlayer.playerIndex}$`), `START${paste.player.playerIndex}`)

        // attempt to populate inputCodes by another emulator ROM
        const controlMatch = allEmuControls.find(control => control.xml.details.inputCodes && control.xml.details.name === newDetails.name)
        if ( controlMatch ) {
          newDetails.inputCodes = controlMatch.xml.details.inputCodes
        }
  
        const copyControl = new PlayerControl(
          this.session.ledBlinky,
          pastePlayer.controls,
          pastePlayer,
        )
  
        copyControl.xml.addDetails(newDetails)
        pastePlayer.addControl(copyControl)
        this.changedControl.emit(copyControl)
      })
      
      this.romControl.xml.update()
      this.romControl.updated$.next(null)
    })

    this.changed.emit()
    delete this.copyPlayer.player
  }

  applyLightControlGuess(
    lightControl: LightAndControl,
    bestGuess: ControlGuess,
  ){
    lightControl.player = this.romControl.paramPlayerByIndex(bestGuess.playerIndex)
    lightControl.control.xml.addDetails({name:bestGuess.name, color: bestGuess.color, inputCodes: bestGuess.inputCodes})
    
    if ( !lightControl.player.controls.find(control => control === lightControl.control) ) {
      lightControl.player.addControl(lightControl.control)
    }

    lightControl.player.updated$.next(null)

    delete this.guessNameLightControl
  }

  getCopyPlayerIndex(player: NewPlayer) {
    const copyPlayer = this.copyPlayer
    if ( !copyPlayer ) {
      return -1
    }

    return copyPlayer.pastePlayers.findIndex(p => p.player === player)
  }

  addRemoveCopyPlayer(player: NewPlayer) {
    const copyPlayer = this.copyPlayer
    if ( !copyPlayer ) {
      return
    }

    const indexOf = this.getCopyPlayerIndex(player)

    // remove if exists
    if ( indexOf >= 0 ) {
      copyPlayer.pastePlayers.splice(indexOf, 1)
      copyPlayer.couldPastePlayers.push(player)
      copyPlayer.couldPastePlayers.sort((b,a)=>Number(a.playerIndex)-Number(b.playerIndex))
      return
    }
    
    copyPlayer.pastePlayers.push({player:player})
    copyPlayer.pastePlayers.sort((b,a)=>Number(a.player.playerIndex)-Number(b.player.playerIndex))
    const removeIndex = copyPlayer.couldPastePlayers.indexOf(player)
    copyPlayer.couldPastePlayers.splice(removeIndex, 1)
  }

  toggleCopyPlayerMerge(player: NewPlayer) {
    const copyPlayer = this.copyPlayer
    if ( !copyPlayer ) {
      return
    }

    let indexOf = this.getCopyPlayerIndex(player)
    if ( indexOf < 0 ) {
      indexOf = copyPlayer.pastePlayers.length
      copyPlayer.pastePlayers.push({player:player})
    }

    const pastePlayer = copyPlayer.pastePlayers[indexOf]
    pastePlayer.merge = !pastePlayer.merge
  }

  configShareLink() {
    this.shareRomDecoded.issues = this.romControl.getUrlShareIssues()
    const urlShare = this.romControl.getUrlShareFormat()
    this.shareRomLink = this.session.getRelativeUrl('../../🤝?v=0&i=' + urlShare)
  }

  getCopyPlayerElm(): ModalElement {
    return document.getElementById('copyPlayerModal_' + this.uid) as unknown as ModalElement
  }
}

interface AddControl {
  playerIndex: number
  inputCode: string
  name: string
  
  names: string[]
  recommended: boolean
  
  // deprecated
  step: number
}


function guessPlayerIndexByName(name: string) {
  if ( !name || name.length < 2 ) {
    return 0
  }

  // TODO: instead of looking for P1 look for P[a-z]*[0-9]{1}
  const sub = name.substring(1,2)
  const num = Number(sub)
  if ( isNaN(num) ) {
    return 0
  }
  
  return num
}

interface CopyPlayer {
  couldPastePlayers: NewPlayer[]
  pastePlayers: {
    player:NewPlayer
    merge?: boolean
  }[]

  player?: NewPlayer // copy from player
  romControl?: NewControlGroup
}

export function decodeShareFormat(string: string): DecodedRomImport {
  const decoded = decodeURIComponent(string)
    .replace(/\.9/g, '\')~(\'START')
    // single char replacements
    .replace(/!1/g, ' ')
    .replace(/!0/g, '}')
    .replace(/!/g, '{')
    .replace(/\(/g, '[')
    .replace(/\)/g, ']')
    .replace(/\*/g, ':')
    .replace(/'/g, '"')
    .replace(/~/g, ',')
    
    // real char exchanges
    .replace(/\.\.0/g, '!') // real !
    .replace(/\.\.1/g, '(') // real (
    .replace(/\.\.2/g, ')') // real )

    .replace(/\.8/g, '.1.5')
    .replace(/\.7/g, '",".5')
    .replace(/\.6/g, '_BUTTON')
    .replace(/\.5/g, 'KEYCODE_')
    .replace(/\.4/g, 'MOUSE')
    .replace(/\.3/g, ':[{')
    .replace(/\.2/g, '"},{')
    .replace(/\.1/g, '","')
    .replace(/\.0/g, '"],["P')

  const json = decoded.replace(/([a-z]+):/gi,'"$1":')
  
  // const result = eval('(() => ('+decoded+'))()')
  const result: ShareRomFormat = JSON.parse(json)

  const castResult: DecodedRomImport = {
    emulator: result.e,
    groupName: result.gn,
    voice: result.v,
    numPlayers: result.np,
    alternating: result.a,
    jukebox: result.j,
    players: [],
  }

  result.p.forEach((player: any) => {
    player.number = player.n
    delete player.n

    if ( !player.c ) {
      return
    }
    const controls = player.c

    player.controls = controls.map((control: ShareControl) => {
      if ( control.length < 4 ) {
        control.push({})
      }

      const data: DecodedControl = {
        name: control[0] as string,
        inputCodes: control[1] as string,
        color: control[2] as string,
        voice: control[3].v as string | undefined,
        primaryControl: control[3].p,
        alwaysActive: control[3].a,
      }
      return data
    })

    delete player.c
    castResult.players.push(player)
  })

  return castResult
}

export declare type ShareControl = [string|number,string|number,string|number,{
  v?: string|number, p?: string, a?: string
}]

interface DecodedControl {
  name: string,
  inputCodes?: string,
  color?: string,
  voice?: string,
  primaryControl?: string,
  alwaysActive?: string,
}

interface DecodedRomImport {
  emulator: EmulatorDetails,
  groupName: string,
  voice?: string,
  numPlayers: string,
  alternating?: string,
  jukebox?: string,
  players: {
    number: string
    controls: DecodedControl[]
  }[]
}