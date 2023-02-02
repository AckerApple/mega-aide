import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { animations } from "ack-angular-fx";
import { Subscription } from "rxjs";
import { routeMap as launchBoxRouteMap } from "../launchbox/launchbox.routing.module"
import { routeMap } from "../ledblinky.routing.module";
import { SessionProvider } from "../session.provider";
import { findEmulatorByName } from "./ledblinky-controls.component"
import { ControlGroup, Emulator, IniNameValuePairs, InputsMap, NewControlGroup, NewEmulator, NewPlayer, Player, PlayerControl, PlayerControlDetails, PlayerDetails } from "./LedBlinky.utils";

@Component({
  animations,
  templateUrl: './rom-controls.component.html',
}) export class RomControlsComponent {
  unknownMode?: boolean
  routeMap = routeMap
  launchBoxRouteMap = launchBoxRouteMap
  romControl?: NewControlGroup | ControlGroup// was controlGroups

  viewXml?: boolean
  viewJson?: boolean

  subs = new Subscription()

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {
    this.subs.add(
      this.session.ledBlinky.directoryChange.subscribe(() => this.load())
    )
  }

  ngOnInit(){
    if ( this.session.ledBlinky.directory ) {
      this.load()
    }
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  async getEmulators(): Promise<(NewEmulator | Emulator)[] | undefined> {
    const ledBlinky = this.session.ledBlinky
    const unknownMode = this.activatedRoute.snapshot.queryParams['unknownMode']
    this.unknownMode = unknownMode ? JSON.parse(unknownMode) : false
    
    // always load known emulators, may need to match with an unknown
    const knownEmulators = (await ledBlinky.loadControls())?.emulators
    let emulators: (NewEmulator | Emulator)[] | undefined = knownEmulators

    if ( this.unknownMode ) {
      const unknowns = await ledBlinky.getUnknownGames()
      if ( unknowns ) {
        if ( knownEmulators ) {
          unknowns.forEach(unknown => {
            const known = knownEmulators.find(known => known.details.emuname === unknown.details.emuname)
            if ( !known ) {
              return
            }

            if ( !unknown.element ) {
              unknown.element = known.element
              unknown.details = known.details
            }
          })
        }
        emulators = unknowns
      }
    }

    return emulators
  }

  inputsMap?: InputsMap
  newInputCodes?: IniNameValuePairs
  async load() {
    const ledBlinky = this.session.ledBlinky
    let emulator = ledBlinky.emulator
    const controls = await ledBlinky.getControls()

    this.newInputCodes = await ledBlinky.loadNewInputCodes()
    this.inputsMap = await ledBlinky.getInputMap()
    console.log('this.inputsMap', this.inputsMap)
    
    if ( !controls ) {
      this.session.error('code should never get here. LEDBlinky Controls not loaded')
      return
    }
    
    const emuName = this.activatedRoute.snapshot.paramMap.get('emuName')
    if ( !emulator ) {
      if ( !emuName ) {
        throw 'no emulator name defined' // todo: relocate to pick emulator
      }

      const emulators = await this.getEmulators()
      if ( !emulators ) {
        this.session.error('code should never get here. LEDBlinky emulators not loaded')
        return
      }
  
      ledBlinky.emulator = emulator = findEmulatorByName(emulators, emuName)
    }

    if ( !emulator ) {
      throw 'no emulator defined'
    }

    const romName = this.activatedRoute.snapshot.paramMap.get('romName')

    if ( !romName ) {
      throw 'no romname defined' // todo relocate to pick rom
    }

    emulator.controlGroups.find(roms => {
      return roms.controlGroups.find(rom => {
        if ( rom.details.groupName !== romName ) {
          return false
        }

        return this.romControl = rom
      })
    })

    if ( !this.romControl ) {
      if ( this.unknownMode ) {
        this.session.warn(`Could not find unknown ${emuName || emulator.details.emuname} ${romName}`)
      } else {
        this.session.warn(`Could not find ${emuName || emulator.details.emuname} ${romName}`)
      }
      return
    }

    if ( this.unknownMode ) {
      // can we fill in the element?
      paramRomElm(this.romControl)
    }
  }

  addPlayer() {
    if ( !this.romControl ) {
      return
    }

    const controls: PlayerControl[] = []
    const element: Element = document.createElement('player')
    const details: PlayerDetails = {
      number: this.romControl.players.length.toString()
    }
    
    setElmAttributes(element, details)
  
    const player: Player = {
      details, element, controls,
    }

    // add player element to rom element
    this.romControl.players.push(player)
    const romElement = paramRomElm(this.romControl)
    romElement.appendChild(element)
  }

  addPlayerControl(player: Player | NewPlayer) {
    const details: PlayerControlDetails = {
      name: '',
      voice: '',
      color: '',
      primaryControl: '',
      inputCodes: '',
    }
    const element = document.createElement('control')
    setElmAttributes(element, details)
    
    const control: PlayerControl = {
      details,
      element,
      cssColor: '',
      inputCodes: []
    }
    
    player.controls.push(control)
    // add to parent element
    player.element?.appendChild(element)
  }
}

function setElmAttributes(element: Element, data: Record<string, string | undefined | null>) {
  Object.entries(data).forEach(([name, value]) => {
    element.setAttribute(name, value as string)
  })
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