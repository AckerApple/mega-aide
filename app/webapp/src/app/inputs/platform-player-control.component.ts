import { Component, EventEmitter, Input, Output } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { Control, PlatformMap } from '../platforms'
import { LastPresses } from './LastPresses.provider'
import { PlatformFiltersDirective } from './platform-filters.directive'
import { LastDrag, hexToRgb, PlayerMap, PlayersMap } from './platform.utils'
import * as controlMap from './control-map.json'
import { LastButtonsProvider } from './LastButtons.provider'
import { getControlGamepadCode } from '../ledblinky/LedBlinky.utils'

@Component({  
  animations,
  selector: 'platform-player-control',
  templateUrl: './platform-player-control.component.html',
}) export class PlatformPlayerControlComponent {
  @Input() player!: PlayerMap
  @Input() filters!: PlatformFiltersDirective
  @Input() platformMap!: PlatformMap
  @Input() playersMap!: PlayersMap

  @Output() afterCopyToPlayer = new EventEmitter<Control[]>()
  
  @Input() keyListen?: Control
  @Input() btnListen?: Control
  @Input() controlListen?: Control // indication of listening for next key press
  @Output() controlListenChange = new EventEmitter<Control>()

  @Input() lastDrag?: LastDrag
  @Output() lastDragChange = new EventEmitter<LastDrag>()

  controlMap = controlMap
  dragRowControl?: Control
  controlPressListening = false
  controlPressListen?: Control
  
  copyToPlayerMode?: boolean
  copyControls: {control: Control, checked: boolean}[] = []

  constructor(
    public lastPresses: LastPresses,
    public lastButtons: LastButtonsProvider,
  ) {}

  // pipe filtering function
  unsorted(): any {}

  copyPlayerToPlayerByEvent(
    player: Control[],
    event: Event | any
  ) {
    const value = (event as any).target.value
    event.target.selectedIndex = 0
    
    if ( !value ) {
      return // first option selected, ignore
    }

    const modes = value.split(':')
    const mode: 'copy' | 'write' | 'geometry' = modes.length === 1 ? 'copy' : modes[0]
    
    let intoIndex = Number( modes[modes.length - 1] )

    const platformMap = this.platformMap as PlatformMap
    if ( intoIndex === -1 || Number.isNaN(intoIndex) ) {
      // create new player
      intoIndex = platformMap.players.length
    }

    const newPlayerMap = player.map(control => ({...control}))
      .filter((_control,index) => this.copyControls[index].checked) // only copy items asked to clone
    
      platformMap.players[intoIndex] = platformMap.players[intoIndex] || []
    
    if ( mode === 'write' ) {
      platformMap.players[intoIndex] = []
    }

    const intoPlayer = platformMap.players[intoIndex]
    
    if ( mode === 'geometry' ) {
      newPlayerMap.forEach(newControl => {
        const existing = intoPlayer.find(existing => existing.label === newControl.label)

        if ( !existing ) {
          intoPlayer.push({ ...newControl })
          return
        }

        existing.x = newControl.x
        existing.y = newControl.y
        existing.width = newControl.width
        existing.height = newControl.height
      })
    } else {
      intoPlayer.push(...newPlayerMap)
    }

    // goto that player
    this.afterCopyToPlayer.emit( intoPlayer )
  }

  dropRow(
    control: Control,
    playerIndex: number
  ) {
    const platformMap = this.platformMap
    const lastDrag = this.playersMap[playerIndex].lastDrag
    const dragControl = lastDrag?.control
    if ( !dragControl || !platformMap ) {
      return
    }
    
    const player = platformMap.players[ playerIndex ]
    const oldIndex = player.findIndex(x => dragControl === x)
    const newIndex = player.findIndex(x => control === x)
    
    const oldItem = player.splice(oldIndex, 1)[0]
    const isMoveUp = oldIndex > newIndex

    if ( isMoveUp ) {
      player.splice(newIndex, 0, oldItem)
    } else {
      player.splice(newIndex-1, 0, oldItem)
    }

    this.dragRowEnd(playerIndex)
  }

  dragRowEnd(playerIndex: number) {
    delete this.dragRowControl
    delete this.playersMap[playerIndex].lastDrag
  }

  dragRowOver(control: Control) {
    this.dragRowControl = control
  }

  dragRowStart(playerIndex: number, control: Control) {
    // what table row is being resorted (this is not absolute buttons)
    this.playersMap[playerIndex].lastDrag = {
      control,
      startOffsetY: 0,
      startOffsetX: 0
    }
  }

  toggleControlByPlayerIndex(
    control: Control,
    playerIndex: number
  ) {
    const playerMap = this.playersMap[playerIndex]
    if ( playerMap.lastDrag?.control === control ) {
      delete playerMap.lastDrag
      return control
    }

    return this.showControlByPlayerIndex(control, playerIndex)
  }

  showControlByPlayerIndex(control: Control, playerIndex: number): LastDrag {
    this.controlPressListening = false
    delete this.controlPressListen
    const playerMap = this.playersMap[playerIndex]
    playerMap.lastDrag = {
      control,
      startOffsetY: 0,
      startOffsetX: 0
    }

    return playerMap.lastDrag
  }

  removeButtonFromMapPlayerByIndex(
    control: Control,
    playerIndex: number
    ) {
    const controls: Control[] = this.platformMap.players[ playerIndex ]
    const toRemoveIndex = controls.findIndex(x => x === control)
    controls.splice(toRemoveIndex, 1)
    
    const playerMap = this.playersMap[ playerIndex ]
    if ( playerMap.lastDrag?.control === control ) {
      delete playerMap.lastDrag
    }
  }

  duplicateButtonByPlayerIndex(
    control: Control,
    playerIndex: number
  ) {
    const player = this.playersMap[ playerIndex ]
    const lastDrag = player.lastDrag as any
    const newControl = lastDrag.control = {...control}
    newControl.label += ' - copy'
    ++newControl.x
    ++newControl.y
    this.platformMap.players[playerIndex].push(newControl)
  }

  setControlColorByPlayerIndex(
    event: Event,
    playerIndex: number
  ) {
    const value = (event.target as any).value
    const playerMap = this.playersMap[playerIndex]
    const control: Control = playerMap.lastDrag?.control as any
    control.color = hexToRgb(value)
  }

  toggleCopyMode() {
    this.copyToPlayerMode = !this.copyToPlayerMode
    const controls = this.platformMap.players[ this.player.index ]
    
    this.copyControls.length = 0
    this.copyControls.push(...controls.map(control => ({control, checked: true})))
  }

  setControlCode(control: Control) {
    control.gamepadCode = getControlGamepadCode(control)
  }
}
