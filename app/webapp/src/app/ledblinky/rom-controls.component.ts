import { Component, NgZone } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { animations } from "ack-angular-fx";
import { combineLatest, EMPTY, firstValueFrom, from, lastValueFrom, map, mergeMap, Observable, of, shareReplay, Subject, switchMap } from "rxjs";
import { routeMap as launchBoxRouteMap } from "../launchbox/launchbox.routing.module"
import { routeMap } from "../ledblinky.routing.module";
import { SessionProvider } from "../session.provider";
import { xmlDocToString } from "../xml.functions";
import { findEmulatorByName } from "./ledblinky-controls.component"
import { ControlGroup, ControlGroupings, Emulator, getControlByElement, getRomObservables, IniNameValuePairs, InputsMap, intToHex, LedBlinkyControls, Light, NewControlGroup, NewControlGroupings, NewEmulator, NewPlayer, Player, PlayerControl, PlayerControlDetails, PlayerDetails } from "./LedBlinky.utils";

interface EmulatorControls {
  emulator: Emulator // NewEmulator
  controls: LedBlinkyControls
}

@Component({
  animations,
  templateUrl: './rom-controls.component.html',
}) export class RomControlsComponent {
  debug = false
  unknownMode?: boolean
  routeMap = routeMap
  launchBoxRouteMap = launchBoxRouteMap
  
  addControl: AddControl = {
    playerIndex: 0, inputCode: '', step:0, name:'', names: [], recommended: false
  }
  changeWatch = 0 // change this number to cause re-rendering of lights
  
  viewXml?: boolean
  viewJson?: boolean
  
  // simple name reference below
  inputsMap$ = this.session.ledBlinky.inputsMap$

  // Reads emuName from url and finds match in <emulator> tag in file LEDBlinkyControls.xml
  emulatorControls$: Observable<EmulatorControls> = this.session.ledBlinky.controls$.pipe(
    mergeMap((controls) => {
      if ( !controls ) {
        return of( undefined )
      }
      
      return from(this.getEmulator(controls).then(emulator=>{
        if ( !emulator ) {
          const emuname = this.activatedRoute.snapshot.paramMap.get('emuName') as string
          console.warn(`🟠 1st emulator registration detected: ${emuname}`)

          emulator = {
            details: {
              emuname,
            },
            element: document.createElement('emulator'), 
            controlGroups: [],
          }
        }


        return { emulator, controls, } as EmulatorControls
      }))
    }),
    switchMap(controls => controls ? of(controls) : EMPTY),
    shareReplay(1),
  )
      
  // romControl?: NewControlGroup | ControlGroup// was controlGroups
  romControl$ = combineLatest([
    this.emulatorControls$,
    this.session.ledBlinky.unknownGames$,
    this.session.ledBlinky.colors$,
  ]).pipe(
    map((
      [{emulator}, unknownGames, colors]
    ) => {
      const romName = this.activatedRoute.snapshot.paramMap.get('romName') as string
      let romControl: NewControlGroup | undefined

      if ( emulator ) {
        romControl = findRomByName(romName, emulator.controlGroups)
      }

      const isNewMode = this.getNewMode()
      if ( isNewMode ) {
        romControl = this.newRom(romName, colors)
      }
      
      const unknownMode = this.unknownMode && unknownGames && !romControl
      console.log('unknownMode', unknownMode, emulator)
      if ( unknownMode ) {
        let unknownEmulator = unknownGames.find(unknown => unknown.details.emuname === emulator.details.emuname)

        if ( !unknownEmulator ) {
          console.warn('🟠 No emulator lookup matchable')
          return
        }

        romControl = findRomByName(romName, unknownEmulator.controlGroups as any) || this.newRom(romName, colors)
        
      }

      if ( (isNewMode || unknownMode) && romControl ) {
        const players = emulator.controlGroups.find(emu => emu.groupName === 'DEFAULT')?.controlGroups[0].players
        if ( players ) {
          romControl.players = players
        }
      }
      
      if ( romControl ) {
        paramRomElm(romControl)
      }

      console.log('rebuilt', romControl)

      return romControl
    }), shareReplay(1)
  )

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
    public ngZone: NgZone,
  ) {}

  newRom(
    romName: string,
    colorRgbConfig?: IniNameValuePairs,
  ) {
    return newRom(romName, this.session.ledBlinky.curve$, colorRgbConfig)
  }

  async getEmulator(controls: LedBlinkyControls) {
    const ledBlinky = this.session.ledBlinky    
    const emuName = this.activatedRoute.snapshot.paramMap.get('emuName')
    if ( !emuName ) {
      throw 'no emulator name defined' // todo: relocate to pick emulator
    }

    const emulators = await this.getEmulatorsByControls(controls)
    if ( !emulators ) {
      this.session.error('code should never get here. LEDBlinky emulators not loaded')
      return
    }

    const emu = findEmulatorByName(emulators, emuName)
    ledBlinky.emulator$.next( emu )
    return emu
  }

  getNewMode() {
    return this.activatedRoute.snapshot.queryParams['new'] // || this.unknownMode
  }

  getUnknownMode() {
    return this.activatedRoute.snapshot.queryParams['unknownMode'] || this.unknownMode
  }

  async getEmulatorsByControls(
    controls: LedBlinkyControls | undefined,
    unknownGames?: NewEmulator[]
  ): Promise<(NewEmulator | Emulator)[] | undefined> {
    const unknownMode = this.getUnknownMode()
    this.unknownMode = unknownMode ? JSON.parse(unknownMode) : false
    // always load known emulators, may need to match with an unknown
    const knownEmulators = controls?.emulators
    let emulators: (NewEmulator | Emulator)[] | undefined = knownEmulators

    if ( this.unknownMode ) {
      if ( !unknownGames ) {
        console.warn('🟠 No unknown games to pull from')
        return emulators
      }

      if ( knownEmulators ) {
        unknownGames.forEach(unknown => {
          const known = knownEmulators.find(known => known.details.emuname === unknown.details.emuname)
          if ( !known ) {
            console.warn('🟠 Emulator has never been seen before')
            return
          }

          if ( !unknown.element ) {
            unknown.element = known.element
            unknown.details = known.details
          }
        })
      }

      emulators = unknownGames
    }

    return emulators
  }

  removePlayerControl(
    player: NewPlayer,
    romControl: NewControlGroup,
  ) {
    const index = romControl.players.findIndex(x => x === player)
    
    if ( index <= 0 ) {
      return this.session.warn('cannot delete player')
    }

    romControl.players.splice(index, 1)
  }

  async addPlayer(romControl: NewControlGroup) {
    const controls: PlayerControl[] = []
    const element: Element = document.createElement('player')
    const details: PlayerDetails = {
      number: romControl.players.length.toString()
    }
    
    setElmAttributes(element, details)
  
    const player: Player = {
      details, element, controls,
    }

    // add player element to rom element
    romControl.players.push(player)
    const romElement = paramRomElm(romControl)
    romElement.appendChild(element)
  }

  async addPlayerControl(
    player: Player | NewPlayer,
    addControl?: AddControl
  ) {
    this.addControl.step = 0
    const element = document.createElement('control')
    const colors = await firstValueFrom(this.session.ledBlinky.colors$)
    const name = addControl?.name ? addControl.name : ''
    
    const control = getControlByElement(element, {
      colorRgbConfig: colors,
      details: {
        name,
        voice: '',
        color: 'Red',
        primaryControl: '',
        inputCodes: addControl?.inputCode,
      },
      curve$: this.session.ledBlinky.curve$,
      controls: player.controls,
      inputsMap: await firstValueFrom(this.inputsMap$)
    })
    
    player.controls.push(control)
    // add to parent element
    player.element?.appendChild(element)
    ++this.changeWatch

    return control
  }
  
  async applyMouseListen(
    button: number,
    details: PlayerControlDetails,
    control: PlayerControl,
    inputCodes: string[],
    inputCodeIndex: number
  ) {
    const fullKey = `MOUSECODE_1_BUTTON` + (button + 1)
    inputCodes[inputCodeIndex] = fullKey

    this.updateDetailsByCodes(control)
  }
  
  async applyKeyListen(
    key: string,
    details: PlayerControlDetails,
    control: PlayerControl,
    inputCodes: string[],
    inputCodeIndex: number
  ) {
    const newKey = key
      .replace(/(^Digit|^Key)/,'')
      .replace(/ShiftLeft/i, 'LSHIFT')
      .replace(/ShiftRight/i, 'RSHIFT')
      .replace(/ControlLeft/i, 'LCONTROL')
      .replace(/ControlRight/i, 'RCONTROL')
      .replace(/AltLeft/i, 'LALT')
      .replace(/AltRight/i, 'RALT')
    
    const fullKey = 'KEYCODE_' + newKey.toUpperCase()
    inputCodes[inputCodeIndex] = fullKey

    this.updateDetailsByCodes(control)
  }

  updateControl$ = new Subject<PlayerControl>()
  updateDetailsByCodes$ = combineLatest([
    this.emulatorControls$,
    this.updateControl$.pipe(
      mergeMap(control => combineLatest([
        control.details$,
        control.inputCodes$
      ]).pipe(
        map(([details, inputCodes]) => ({
          control, inputCodes, details
        }))
      ))
    ),
  ]).pipe(
    map(([emulator, control]) => {
      control.details.inputCodes = control.inputCodes.join(',')
      control.control.edited = true
      
      // TODO, need to save details back up to original XML object
      console.warn('TODO need to save details back up to original XML object')

      this.session.addFileToSave({
        file: emulator.controls.file,
        string: xmlDocToString(emulator.controls.xml)
      })
    })
  )

  updateDetailsByCodes(
    control: PlayerControl,
  ) {
    firstValueFrom(this.updateDetailsByCodes$) // causes latest value fetch
    this.updateControl$.next(control)
    control.detailsChanged$.next( undefined )
    ++this.changeWatch
  }

  /** When <ledblinky-layouts (lightChanged)> then this function:
   * - figures out which control was changed by comparing to light that said it changed
   */
  async lightChanged(light: Light) {
    const [ controls, lightDetails, inputsMap ] = await Promise.all([
      firstValueFrom(this.romControl$),
      firstValueFrom(light.details$),
      firstValueFrom(this.inputsMap$),
    ])
    
    if ( !controls?.players ) {
      return // no players no work
    }

    // Convert named light into inputCodes so we can then compare game control inputCodes
    const inputCodes = getInputCodesByLabel(inputsMap, lightDetails.name)
    const colorDec = await firstValueFrom(light.colorDec$)
    // const cssValue = intToHex(colorDec)

    // build a map of just the data we need to work with
    const proms = controls.players.map(async player =>
      player.controls.map(async control => {
        const details = await firstValueFrom(control.details$)
        const localCodes = details.inputCodes?.split(',') || []
        const match = localCodes.find(localCode => inputCodes.includes(localCode))
        if ( match ) {
          const cssValue = intToHex(colorDec)
          control.edited = true
          control.updateToCssColor$.next(cssValue)
        }
        
        return match
      })
    )
  }

  onModalClose() {
    this.addControl.recommended = false
  }

  async loadNameRecommendations() {
    console.log('start')
    lastValueFrom(
      this.session.ledBlinky.getAverageNamesForInputCode$(
        this.addControl.inputCode,
        this.addControl.playerIndex,
      ).pipe(
        map(names => this.addControl.names = names)
      )
    ).then((x) => console.log('✅ ✅ ✅ end', x))
    
    this.addControl.recommended = true
  }

  async prepareAddControlByLight(
    light: Light,
    emulator: Emulator,
  ) {
    const details = await firstValueFrom(light.details$)
    this.addControl.step = this.addControl.step + 1
    this.addControl.playerIndex = guessPlayerIndexByName(details.name)
    this.addControl.name = ''

    const inputsMap = await firstValueFrom(this.inputsMap$)
    const codes = getInputCodesByLabel(inputsMap, details.name)
    if ( codes.length ) {
      this.addControl.inputCode = codes[0]
      // preload selected name
      // this.addControl.name = await this.session.ledBlinky.getEmulatorAverageNameByInputCode(emulator, this.addControl.inputCode)
    }
  }
}

function setElmAttributes(
  element: Element,
  data: Record<string, string | undefined | null>
): Record<string, string | undefined | null> {
  Object.entries(data).forEach(([name, value]) => {
    element.setAttribute(name, value as string)
  })
  return data
}

function paramRomElm(
  romControl: NewControlGroup | ControlGroup
) {
  if ( !romControl.element ) {
    const element = document.createElement('controlGroup')
    romControl.element = element
  }
  setElmAttributes(romControl.element, romControl.details)
  return romControl.element
}

function findRomByName(
  romName: string,
  emulators: (ControlGroupings | NewControlGroupings)[]
) {
  for (const emu of emulators) {
    for (const rom of emu.controlGroups) {
      if ( rom.details.groupName !== romName ) {
        continue
      }
      
      return rom  
    }
  }
  return
}

function getInputCodesByLabel(inputsMap: InputsMap, label: string) {
  const match = inputsMap.labels.find(item => item.label === label)
  return match ? match.inputCodes : []
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

interface AddControl {
  playerIndex: number
  inputCode: string
  name: string
  
  names: string[]
  recommended: boolean
  
  // deprecated
  step: number
}

function newRom(
  romName: string,
  curve$: Observable<number>,
  colorRgbConfig?: IniNameValuePairs,
) {
  const details = { groupName: romName }
  
  return {
    details,
    element: document.createElement('controlgroup'),
    players: [],
    ...getRomObservables(details, curve$, colorRgbConfig)
  }
}