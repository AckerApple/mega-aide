import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { animations } from "ack-angular-fx";
import { firstValueFrom, from, map, mergeMap, Observable, of, shareReplay, Subscription } from "rxjs";
import { routeMap as launchBoxRouteMap } from "../launchbox/launchbox.routing.module"
import { routeMap } from "../ledblinky.routing.module";
import { SessionProvider } from "../session.provider";
import { findEmulatorByName } from "./ledblinky-controls.component"
import { ControlGroup, Emulator, getControlByElement, LedBlinkyControls, NewControlGroup, NewEmulator, NewPlayer, Player, PlayerControl, PlayerControlDetails, PlayerDetails } from "./LedBlinky.utils";

@Component({
  animations,
  templateUrl: './rom-controls.component.html',
}) export class RomControlsComponent {
  unknownMode?: boolean
  routeMap = routeMap
  launchBoxRouteMap = launchBoxRouteMap
  
  viewXml?: boolean
  viewJson?: boolean
  
  // inputsMap?: InputsMap
  inputsMap$ = this.session.ledBlinky.inputsMap$.pipe(
    shareReplay(1),
  )  

  emulator$: Observable<NewEmulator | undefined> = this.session.ledBlinky.controls$.pipe(
    mergeMap((controls) => {
      if ( !controls ) {
        return from( Promise.resolve(undefined) )
      }
      
      return from(this.getEmulator(controls))
    })
  )
      
  // romControl?: NewControlGroup | ControlGroup// was controlGroups
  romControl$ = this.emulator$.pipe(
    map(emulator => {
      if ( !emulator ) {
        return
      }
      
      const romName = this.activatedRoute.snapshot.paramMap.get('romName')
      let romControl: NewControlGroup | undefined
      
      emulator.controlGroups.find(roms => {
        return roms.controlGroups.find(rom => {
          if ( rom.details.groupName !== romName ) {
            return false
          }
    
          return romControl = rom
        })
      })

      
      if ( this.unknownMode && romControl ) {
        // can we fill in the element?
        paramRomElm(romControl)
      }
      
      return romControl
    })
  )

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {}

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

  async getEmulatorsByControls(
    controls: LedBlinkyControls | undefined,
    unknownGames?: NewEmulator[]
  ): Promise<(NewEmulator | Emulator)[] | undefined> {
    const unknownMode = this.activatedRoute.snapshot.queryParams['unknownMode']
    this.unknownMode = unknownMode ? JSON.parse(unknownMode) : false
    // always load known emulators, may need to match with an unknown
    const knownEmulators = controls?.emulators
    let emulators: (NewEmulator | Emulator)[] | undefined = knownEmulators

    if ( this.unknownMode ) {
      if ( unknownGames ) {
        if ( knownEmulators ) {
          unknownGames.forEach(unknown => {
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
        emulators = unknownGames
      }
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

  async addPlayerControl(player: Player | NewPlayer) {    
    const element = document.createElement('control')
    const colors = await firstValueFrom(this.session.ledBlinky.colors$)
    const control = getControlByElement(element, colors,
      {
        name: '',
        voice: '',
        color: '',
        primaryControl: '',
        inputCodes: '',
      }
    )
    
    player.controls.push(control)
    // add to parent element
    player.element?.appendChild(element)
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