import { Component } from "@angular/core"
import { SessionProvider } from "../session.provider"
import { ActivatedRoute } from "@angular/router"
import { decodeShareFormat } from "./rom-display.component"
import { Emulator, EmulatorDetails, NewEmulator } from "./Emulator.class"
import { ControlGroup, ControlGroupDetails } from "./ControlGroup.class"
import { NewPlayer, PlayerDetails } from "./Player.class"
import { PlayerControl, PlayerControlDetails } from "./PlayerControl.class"
import { animations } from "ack-angular-fx"
import { findEmulatorByName } from "./ledblinky-controls.component"
import { LedBlinkyControls } from "./LedBlinky.utils"
import { firstValueFrom } from "rxjs"
import { findRomByName } from "./rom-controls.component"

@Component({
  templateUrl: './ImportRom.component.html',
  animations,
}) export class ImportRomComponent {
  debug?: boolean
  layoutOnly = true
  mode?: 'new' | 'overwrite' | 'merge-over'

  importRom: {
    decodedData?: any
    emulator?: NewEmulator // <emulator> LEDBlinkyControls.xml
    controlGroup?: ControlGroup // <controlGroup> LEDBlinkyControls.xml
    comparable?: {
      emulator: Emulator
      controlGroup: ControlGroup
    } // <controlGroup> LEDBlinkyControls.xml
  } = {}

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {
    const importData = this.activatedRoute.snapshot.queryParams['i']
    const data = this.importRom.decodedData = decodeShareFormat(importData)

    // create <emulator>
    const emulatorDetails: EmulatorDetails = data.emulator
    const emu = this.importRom.emulator = new Emulator(this.session.ledBlinky, emulatorDetails)

    const details: ControlGroupDetails = {
      ...data as any,
    }
    delete (details as any).emulator
    delete (details as any).players

    // create <controlGroup>
    const controlGrouping = emu.createControlGroupByDetails(details)
    const controlGroup = this.importRom.controlGroup = controlGrouping.controlGroups[0]

    // create <player>
    data.players.map(player => {
      const newPlayer = controlGroup.addPlayer()
      newPlayer.xml.addDetails({number: player.number})

      player.controls.forEach(control => {
        const playerControl = new PlayerControl(
          this.session.ledBlinky,
          newPlayer.controls,
          newPlayer,
        )

        playerControl.xml.addDetails(control as PlayerControlDetails)
        newPlayer.addControl(playerControl)
      })

      return newPlayer
    })

    this.findComparable(emu)
  }

  async findComparable(emulator: NewEmulator) {
    const controls: LedBlinkyControls = await firstValueFrom(this.session.ledBlinky.controls$)
    const emulatorMatch = findEmulatorByName(controls.emulators, emulator.xml.details.emuname)
    const controlGroup = this.importRom.controlGroup

    if ( !emulatorMatch || !controlGroup ) {
      delete this.importRom.comparable
      return
    }

    const controlGroupMatch = findRomByName(controlGroup.xml.details.groupName, emulatorMatch.controlGroups)

    if ( !controlGroupMatch ) {
      return
    }

    this.importRom.comparable = {
      emulator: emulatorMatch,
      controlGroup: controlGroupMatch
    }
  }

  async runImportProcess() {
    const controls: LedBlinkyControls = await firstValueFrom(this.session.ledBlinky.controls$)

    switch (this.mode) {
      case 'overwrite':
        this.runOverwrite(controls)
        break

      case 'merge-over':
        this.runOverwrite(controls)
        break
    
      default:
        this.runImport(controls)
    }

    this.session.ledBlinky.saveControls(controls)
  }

  async runOverwrite(
    controls: LedBlinkyControls
  ) {
    // remove comparable
    const compare = this.importRom.comparable
    if ( !compare ) {
      this.session.error('Expected import comparable')
      return
    }

    // remove the old
    const oldEmuElm = compare.emulator.xml.element
    oldEmuElm.parentNode?.removeChild(oldEmuElm)

    this.runImport(controls)
  }

  async runImport(
    controls: LedBlinkyControls
  ) {
    const emu = this.importRom.emulator

    if ( !emu ) {
      this.session.error('Expected import emulator')
      return
    }

    // add in the import
    const emuElm = emu.xml.element
    const datElm = controls.xml.getElementsByTagName('dat')[0]
    datElm.appendChild(emuElm)
  }
}