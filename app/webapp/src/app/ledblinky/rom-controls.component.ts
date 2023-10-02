import { Component, NgZone } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { animations } from "ack-angular-fx"
import { BehaviorSubject, combineLatest, EMPTY, from, map, mergeMap, Observable, of, shareReplay, Subject, switchMap } from "rxjs"
import { SessionProvider } from "../session.provider"
import { findEmulatorByName } from "./ledblinky-controls.component"
import { InputsMap, LedBlinkyControls } from "./LedBlinky.utils"
import { Prompts } from "ack-angular";
import { PlayerControl } from "./PlayerControl.class"
import { createElement } from "../launchbox/games.utils"
import { ControlGroup, NewControlGroup } from "./ControlGroup.class"
import { Emulator, NewEmulator } from "./Emulator.class"
import { ControlGroupings, NewControlGroupings } from "./ControlGroupings"
import { EmulatorControls } from "./EmulatorControls"

@Component({
  animations,
  templateUrl: './rom-controls.component.html',
}) export class RomControlsComponent {
  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
    public ngZone: NgZone,
    public prompts: Prompts
  ) {}

  unknownMode?: boolean
  
  // simple name reference below
  inputsMap$ = this.session.ledBlinky.inputsMap$

  // Reads emuName from url and finds match in <emulator> tag in file LEDBlinkyControls.xml
  allControls$: Observable<EmulatorControls> = this.session.ledBlinky.controls$.pipe(
    mergeMap((controls) => {
      if ( !controls ) {
        return of( undefined )
      }
      
      return from(this.getEmulator(controls).then(emulator=>{
        if ( !emulator ) {
          const emuname = this.activatedRoute.snapshot.paramMap.get('emuName') as string
          console.warn(`🟠 1st emulator registration detected: ${emuname}`)

          const details = { emuname }
          emulator = new Emulator(this.session.ledBlinky, details)
        }

        return { emulator, controls, } as EmulatorControls
      }))
    }),
    switchMap(controls => controls ? of(controls) : EMPTY),
    shareReplay(1),
  )

  
  romNotFound?: boolean
  romControl$: Observable<NewControlGroup | undefined> = combineLatest([
    this.allControls$,
    this.session.ledBlinky.unknownGames$,
  ]).pipe(
    mergeMap((
      [{emulator}, unknownGames]
    ) => {
      const romName = this.activatedRoute.snapshot.paramMap.get('romName') as string
      let romControl: NewControlGroup | undefined

      if ( emulator ) {
        romControl = findRomByName(romName, emulator.controlGroups)
      }

      const isNewMode = this.getNewMode()
      const isCreateMode: boolean = !romControl && isNewMode // do not go new mode if we already found a match
      if ( isCreateMode ) {
        romControl = this.newEmulatorRom(emulator, romName)
      }
      
      const unknownMode = this.unknownMode && unknownGames && !romControl
      if ( unknownMode ) {
        let unknownEmulator = unknownGames.find(unknown => unknown.xml.details.emuname === emulator.xml.details.emuname)

        if ( !unknownEmulator ) {
          return of(undefined)
        }

        romControl = findRomByName(romName, unknownEmulator.controlGroups as any)
        
        if ( !romControl ) {
          romControl = this.newEmulatorRom(emulator, romName)
        }
      }

      const lookupDefaultLayout: NewControlGroup = (isNewMode || unknownMode) && isCreateMode
      if ( lookupDefaultLayout && romControl ) {
        this.loadDefaultLayoutByRom(romControl)
      }
      
      if ( romControl ) {
        paramRomElm(romControl)
        delete this.romNotFound
      } else {
        romControl = this.newEmulatorRom(emulator, romName)
        console.warn('🟠 ROM not found')
        this.romNotFound = true
      }

      return of(romControl)
    }),
    shareReplay(1),
  )

  confirmDefaultEmu?: {
    romControl: NewControlGroup
    defaultEmu: NewControlGroupings
  }

  loadDefaultLayoutByRom(
    romControl: NewControlGroup
  ) {
    if ( romControl.xml.details.groupName.toUpperCase()==='DEFAULT' ) {
      return // it is the default
    }

    const emulator = romControl.emulator
    const defaultEmu = emulator.controlGroups.find(emu => emu.groupName === 'DEFAULT')

    // has default and the default has a config
    if ( defaultEmu && defaultEmu.controlGroups.length ) {
      romControl.players = romControl.players || []
      // process will take over as a display
      this.confirmDefaultEmu = {
        romControl,
        defaultEmu
      }
    }
  }

  confirmToUseDefaultEmu(confirmed: boolean) {
    const setup = this.confirmDefaultEmu
    delete this.confirmDefaultEmu

    if ( !confirmed || !setup ) {
      return
    }

    console.warn('🚦 Emulator default button layout has been loaded')
    const rc = setup.romControl
    const players = setup.defaultEmu?.controlGroups[0].players
    if ( players ) {
      rc.players = players
    }

    paramRomElm(rc)
    
    return rc
  }

  updateControl$ = new Subject<PlayerControl>()
  // When controls updated, update details and save
  updateDetailsByCodes$ = combineLatest([
    this.allControls$,
    this.updateControl$.pipe(
      map(control => ({
        control,
        inputCodes: control.getInputCodes(),
        details: control.xml.details,
      }))
    ),
  ]).pipe(
    map(([emulator, control]) => {
      control.details.inputCodes = control.inputCodes.join(',')
      control.control.edited = true
      this.session.ledBlinky.saveControls(emulator.controls)
    })
  )
  
  // changeWatch = 0 // change this number to cause re-rendering of lights

  newEmulatorRom(
    emulator: NewEmulator,
    romName: string
  ) {
    return newEmulatorRom(emulator, romName)
  }

  emulator$ = new BehaviorSubject<NewEmulator | Emulator | undefined>(undefined)
  async getEmulator(controls: LedBlinkyControls) {
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
    this.emulator$.next( emu )
    return emu
  }

  isNewMode?: boolean
  getNewMode() {
    return this.isNewMode || this.activatedRoute.snapshot.queryParams['new'] // || this.unknownMode
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

    if ( this.unknownMode && unknownGames ) {
      emulators = castUnknownGamesToEmus(unknownGames, knownEmulators)
    }

    return emulators
  }

  async updateDetailsByCodes(
    control: PlayerControl,
    allControls: EmulatorControls,
  ) {
    this.updateControl$.next(control)
    control.xml.addDetails(control.xml.details)
    this.session.ledBlinky.saveControls(allControls.controls)
  }
}

export function setElmAttributes(
  element: Element,
  data: Record<string, string | undefined | null>
): Record<string, string | undefined | null> {
  Object.entries(data).forEach(([name, value]) => {
    element.setAttribute(name, value as string)
  })
  return data
}

export function paramRomElm(
  romControl: NewControlGroup | ControlGroup
) {
  if ( !romControl.xml.element ) {
    const element = createElement('controlGroup')
    romControl.xml.element = element
  }

  // set base defaults
  romControl.xml.element.setAttribute('voice', '')
  romControl.xml.element.setAttribute('numPlayers', '0')
  romControl.xml.element.setAttribute('alternating', '0')
  romControl.xml.element.setAttribute('jukebox', '0')
  
  romControl.xml.details.voice = romControl.xml.details.voice || ''
  romControl.xml.details.numPlayers = romControl.xml.details.numPlayers || '0'
  romControl.xml.details.alternating = romControl.xml.details.alternating || '0'
  romControl.xml.details.jukebox = romControl.xml.details.jukebox || '0'

  setElmAttributes(romControl.xml.element, romControl.xml.details)
  return romControl.xml.element
}

export function findRomByName(
  romName: string,
  controlGroups: (ControlGroupings | NewControlGroupings)[] // <controlGroup> aka room
) {
  for (const emu of controlGroups) {
    const emulator = findRomInRomsByName(romName, emu.controlGroups)

    if ( emulator ) {
      return emulator
    }
  }

  return
}

function findRomInRomsByName(
  romName: string,
  controlGroups: ControlGroup[],
) {
  for (const rom of controlGroups) {
    if ( rom.xml.details.groupName !== romName ) {
      continue
    }
    
    return rom  
  }

  return
}

export function getInputCodesByLabel(inputsMap: InputsMap, label: string) {
  const match = inputsMap.labels.find(item => item.label === label)
  return match ? match.inputCodes : []
}

function newEmulatorRom(
  emulator: NewEmulator,
  romName: string,
): NewControlGroup {
  return emulator.createControlGroupByDetails({ groupName: romName }).controlGroups[0]
}

function castUnknownGamesToEmus(
  unknownGames: NewEmulator[],
  knownEmulators?: NewEmulator[],
) {
  if ( knownEmulators ) {
    unknownGames.forEach(unknown => {
      const known = knownEmulators.find(known => known.xml.details.emuname === unknown.xml.details.emuname)
      if ( !known ) {
        console.warn('🟠 Emulator has never been seen before')
        return
      }

      if ( !unknown.xml.element ) {
        unknown.xml.element = known.xml.element
        unknown.xml.setDetails(known.xml.details)
      }
    })
  }

  return unknownGames
}