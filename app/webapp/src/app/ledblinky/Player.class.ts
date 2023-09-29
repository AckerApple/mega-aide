import { BehaviorSubject, combineLatest, from, mergeMap } from "rxjs"
import { PlayerControl } from "./PlayerControl.class"
import { XmlDetails } from "./XmlDetails.class"
import { NewControlGroup } from "./ControlGroup.class"
import { LedBlinky } from "./LedBlinky.class"
import { addMissingControlsToLightControls, marryPlayerControlsToLights } from "./LedBlinky.utils"
import { createElement } from "../launchbox/games.utils"

export interface PlayerDetails {
  number: string
  [index: string]: string | null
}

/** <player number="1"> Base class of Player used for new Player placeholders */
export class NewPlayer {
  public xml = new XmlDetails<PlayerDetails>({} as PlayerDetails, document.createElement('player'))
  
  constructor(
    details: PlayerDetails,
    public controlGroup: NewControlGroup,
    public controls: PlayerControl[], // aka array of <control name="P1_BUTTON2" voice="" color="48,0,12" inputCodes="KEYCODE_LALT"/>
    public playerIndex: number,
    element: Element = createElement('player'),
    public ledBlinky: LedBlinky,
  ) {
    this.xml.element = element
    this.xml.addDetails(details)
  }

  updated$ = new BehaviorSubject<null>(null)
  show?: boolean // used to unfold details of a player
  debug?: boolean

  realControlLights$ = combineLatest([
    this.ledBlinky.lightLayout$,
    this.updated$,
  ]).pipe(
    mergeMap(([lightLayoutConfig]) => {
      return from((async () => {
        if ( !lightLayoutConfig ) {
          return []
        }
  
        const controlLights = await marryPlayerControlsToLights(this, lightLayoutConfig, this.ledBlinky)

        // add missing controls
        addMissingControlsToLightControls(this, controlLights, this.ledBlinky)

        return controlLights
      })()
      )
    })
  )

  addControl(control: PlayerControl) {
    this.controls.push(control)
    this.xml.element.appendChild( control.xml.element )
    this.updated$.next(null)
  }
}

export class Player extends NewPlayer {
  constructor(
    details: PlayerDetails,
    public override controlGroup: NewControlGroup,
    public override controls: PlayerControl[], // aka array of <control name="P1_BUTTON2" voice="" color="48,0,12" inputCodes="KEYCODE_LALT"/>
    public override playerIndex: number,
    element: Element = createElement('player'),
    public override ledBlinky: LedBlinky,
  ) {
    super(details, controlGroup, controls, playerIndex, element, ledBlinky)
  }
}