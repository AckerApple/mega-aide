import { Observable, merge, of } from "rxjs"
import { createElement } from "../launchbox/games.utils"
import { ControlGroup, ControlGroupDetails, NewControlGroup } from "./ControlGroup.class"
import { ControlGroupings, NewControlGroupings } from "./ControlGroupings"
import { LedBlinky } from "./LedBlinky.class"
import { ControlDefaults, getControlByElement, mapPlayerElement } from "./LedBlinky.utils"
import { NewPlayer, PlayerDetails } from "./Player.class"
import { ControlDefault, PlayerControl } from "./PlayerControl.class"
import { XmlDetails } from "./XmlDetails.class"
import { elmAttributesToObject, getElementsByTagName } from "./element.utils"

export interface EmulatorDetails {
  emuname: string
  emuDesc?: string
  [index: string]: string | null | undefined
}

// <emulator>
export class NewEmulator {
  public xml = new XmlDetails<EmulatorDetails>({} as EmulatorDetails, document.createElement('emulator'))

  controlGroups: NewControlGroupings[] = [] // ControlGroupings
  viewJson?: boolean
  viewXml?: boolean

  defaultControls$ = new Observable<NewControlGroup>(sub => {
    let defaultFound: NewControlGroup | undefined = undefined
    
    this.controlGroups.find(controlGroup => {
      const result = controlGroup.controlGroups.find(controlGroup => {
        if ( controlGroup.xml.details.groupName !== 'DEFAULT' ) {
          return
        }
        return defaultFound = controlGroup
      })

      return result
    })

    if ( defaultFound ) {
      sub.next( defaultFound )
    }

    sub.complete()
  })

  constructor(
    public ledBlinky: LedBlinky,
    details: EmulatorDetails,
    element: Element = createElement('emulator'),
  ) {
    this.xml.element = element
    this.xml.addDetails(details)
  }

  // create <controlGroup>
  createControlGroupByDetails(
    details: ControlGroupDetails
  ) {
    const controlGroup = this.addControlGroupByDetails(details)
    
    const game: NewControlGroupings = {
      groupName: details.groupName,
      controlGroups: [
        controlGroup
      ],
    }

    this.controlGroups.push(game)
    this.xml.element.appendChild(controlGroup.xml.element)

    return game
  }

  // add <controlGroup>
  addControlGroupByDetails(
    details: ControlGroupDetails
  ) {
    const controlGroup = new NewControlGroup(this, [], this.ledBlinky)
    controlGroup.xml.addDetails(details)
    this.xml.element.appendChild(controlGroup.xml.element)  
    // this.controlGroups.push(controlGroup)
    return controlGroup
  }

  getControlGroupElements() {
    return getElementsByTagName(this.xml.element, 'controlGroup')
  }

  loadControlGroups(
    controlDefault: ControlDefaults | undefined
  ) {
    const controlGroups = this.getControlGroupElements()
    return controlGroups.map(controlGroupElm => {
      const players: NewPlayer[] = []
      const controlGroup: ControlGroup = new ControlGroup(this, players, this.ledBlinky)
      controlGroup.xml.element = controlGroupElm
  
      const controls = getControlsByElement(controlGroupElm, controlGroup, this.ledBlinky)
      const playerElements: Element[] = getElementsByTagName(controlGroupElm, 'player')
      const romDetails = elmAttributesToObject(controlGroupElm) as ControlGroupDetails
      const config =  {
        controlDefault,
        ledBlinky: this.ledBlinky,
      }
  
      playerElements.map((element, playerIndex) => {
        playerIndex = Number(element.getAttribute('number')) || playerIndex
        const player = getPlayerByElm(
          element, controlGroup,
          controls as PlayerControl[],
          playerIndex, this.ledBlinky,
        ) as NewPlayer
        
        controlGroup.players.push(player)
        
        return mapPlayerElement(
          element, {
            ...config,
            playerIndex,
            player,
            controlGroup,
          }
        )
      })
  
      // sort by player number
      players.sort((a,b)=>String(a.xml.details.number||'').toLowerCase()>String(b.xml.details.number||'').toLowerCase()?1:-1)
  
      controlGroup.xml.addDetails(romDetails)
  
      return controlGroup
    })
  }
}

// <emulator>
export class Emulator extends NewEmulator {
  override controlGroups: ControlGroupings[] = []// ControlGroupings[] // ControlGroupings[]  
}

// loads <control> tags
export function getControlsByElement(
  controlDefault: Element, // could be <controlDefaults> or <player>
  controlGroup: NewControlGroup,
  ledblinky: LedBlinky,
) {
  const controls: (PlayerControl | ControlDefault)[] = []
  const controlElements = getElementsByTagName(controlDefault, 'control')
  
  controls.push(
    ...controlElements.map(element =>{
      let player: NewPlayer | undefined

      const playerElement = element.parentElement
      if ( playerElement?.tagName === 'player' ) {
        const playerIndex = Number(playerElement.getAttribute('number'))
        player = getPlayerByElm(
          playerElement,
          controlGroup,
          controls as PlayerControl[],
          playerIndex, ledblinky
        ) as NewPlayer
      }

      return getControlByElement(element, {
        controls, ledblinky, player,
      })
    }
    )
  )

  return controls
}

function getPlayerByElm(
  element: Element, // <player>
  controlGroup: NewControlGroup,
  controls: PlayerControl[],
  playerIndex: number,
  ledBlinky: LedBlinky,
): NewPlayer | undefined {
  const playerElm = element.tagName === 'player' ? element : element.parentElement as Element
  if ( playerElm.tagName !== 'player' ) {
    return
  }

  const playerDetails = elmAttributesToObject(playerElm) as PlayerDetails
  return new NewPlayer(
    playerDetails,
    controlGroup,
    controls,
    playerIndex,
    playerElm,
    ledBlinky
  )
}
