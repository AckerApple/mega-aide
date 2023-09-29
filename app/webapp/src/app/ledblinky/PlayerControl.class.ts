import { BehaviorSubject, Observable, Subscriber, combineLatest, firstValueFrom, map } from "rxjs"
import { castControlDetailsToCssColor, getLabelByInputCodes, rgbNum } from "./LedBlinky.utils"
import { LedBlinky } from "./LedBlinky.class"
import { createElement } from "../launchbox/games.utils"
import { EmulatorRom } from "./LightAndControl.interface"
import { NewPlayer } from "./Player.class"
import { LightDetails } from "./Light.class"
import { XmlDetails } from "./XmlDetails.class"
import { ControlGroup } from "./ControlGroup.class"
import { Emulator } from "./Emulator.class"
import { hexToRgb } from "../inputs/platform.utils"

export interface PlayerControlDetails {
  name: string // example: "CONTROL_TRACKBALL"
  voice?: string // example: "Trackball"
  color: string
  
  inputCodes?: string // "KEYCODE_1|KEYCODE_2"
  allowConfigPlayerNum?: string | null // "0" | "1" | "2" ... "8"
  
  primaryControl?: "0" | "1"
  alwaysActive?: "0" | "1"
  // [index: string]: string | null | undefined
}

// represents <control> within <controlDefaults>
export class ControlDefault {
  xml = new XmlDetails<PlayerControlDetails>(
    <PlayerControlDetails>{
      name: '', // example: "CONTROL_TRACKBALL"
      // voice: '', // example: "Trackball"
      // color: '',  
    },
    createElement('control')
  )

  constructor(
    public ledBlinky: LedBlinky,
    public controls: ControlDefault[], // the group of controls this instance belongs to
  ) {}
  

  edit?: boolean
  edited?: boolean
  loadCount$ = new BehaviorSubject(0)  

  /** determines if this element is placeholder or legit saved control */
  getIsSaved() {
    return this.xml.element?.parentNode?.parentNode ? true : false
  }

  getInputCodes() {
    return this.xml.details.inputCodes?.replace(/(^\||\|$)/g,'').split('|') || []
  }
  
  // computed data points
  // runtime conversion of player.controls[n].inputCodes into LEDBlinkyInputMap.xml ledControllers[x].ports[x].label
  layoutLabel$: Observable<string | undefined> = combineLatest([
    this.ledBlinky.inputsMap$,
  ]).pipe(
    map(([inputsMap]) => getLabelByInputCodes(inputsMap, this.getInputCodes()))
  )

  usedCodes$: Observable<string[]> = this.xml.details$.pipe(
    map(_details => this.controls.map(control => control.xml.details.name))
  )
}

// represents <control> within <player>
export class PlayerControl extends ControlDefault {
  constructor(
    public override ledBlinky: LedBlinky,
    // TODO: controls maybe redundant of this.player.controls
    public override controls: PlayerControl[], // the group of controls this instance belongs to
    public player: NewPlayer, // When NOT present this is for a <controlDefaults>
  ) {
    super(ledBlinky, controls)
  }
     
  cssColor$ = combineLatest([
    this.ledBlinky.curve$,
    this.ledBlinky.colors$,
    this.xml.details$
  ]).pipe(
    map(([curve, colorRgbConfig]) => castControlDetailsToCssColor(
      this.xml.details, colorRgbConfig, curve
    ))
  )

  rgbArray$ = this.cssColor$.pipe(
    map(css => hexToRgb(css))
  )

  /** detects what type of color and then processes */
  updateToColor(color: string) {
    const isCommaNumbers = color.split(',').every(x => !isNaN(Number(x)))
    if ( isCommaNumbers ) {
      this.updateToColorName(color)
      return
    }
    
    this.updateToCssColor(color)
  }

  updateToColorName(color: string) {
    this.xml.addDetails({color})
  }

  updateToCssColor(cssColor: string) {
    if ( !cssColor ) {
      return
    }

    const noHashValue = cssColor.replace('#','')
    this.xml.details.color = hexToRgb(noHashValue).map(rgbNum).join(',')
    this.xml.addDetails(this.xml.details) // cause emit and save
  }

  delete() {
    const deleteIndex = this.controls.findIndex(iCon => iCon === this)
    
    if ( deleteIndex<0 ) {
      console.warn('🟠 🗑️ Light does not exist in controls to delete')
      return
    }

    this.controls.splice(deleteIndex,1)
    this.xml.delete()
    this.player.updated$.next(null)
    this.player.controlGroup.updated$.next(null)
  }

  addInputCode(code: string) {
    this.edited = true
    const inputCodes = this.getInputCodes()
    inputCodes.push(code)
    this.xml.addDetails({inputCodes: inputCodes.join('|')})
  }

  updateInputCodeAt(code: string, codeIndex: number) {
    this.edited = true
    const inputCodes = this.getInputCodes()
    inputCodes[codeIndex] = code
    this.xml.addDetails({inputCodes: inputCodes.join('|')})
  }

  removeInputCodeByIndex(codeIndex: number) {
    this.edited = true
    const inputCodes = this.getInputCodes()
    
    inputCodes.splice(codeIndex,1)
    
    this.xml.details.inputCodes = inputCodes.join('|')
    this.xml.update()
  }
}

export async function emitRomsUsingSame(
  bs: Subscriber<EmulatorRom[]>,
  emus: Emulator[],
  details: LightDetails,
) {
  const emuRoms: EmulatorRom[] = []
  for (const emulator of emus) {
    for (const controlGroup of emulator.controlGroups) {
      for (const rom of controlGroup.controlGroups) {
        // await delay(0) // add time gap to allow Angular rendering
        const playerControl = await romHasLight(rom, details)

        if ( playerControl ) {
          emuRoms.push({
            rom, emulator,
            playerControl: playerControl.control,
            playerIndex: playerControl.playerIndex,
          })
          bs.next(emuRoms)
          break
        }
      }
    }
  }
  bs.complete()
  return emuRoms
}

async function romHasLight(
  rom: ControlGroup,
  details: LightDetails
) {
  let playerIndex = 0
  for (const player of rom.players) {
    for (const control of player.controls) {
      const controlLabel = await firstValueFrom(control.layoutLabel$)
      if ( controlLabel === details.name ) {
        return { control, player, playerIndex }
      }
    }
    
    ++playerIndex
  }
  
  return
}
