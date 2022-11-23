import { Component } from '@angular/core'
import { Control, PlatformMap } from '../platforms'
import { SessionProvider } from '../session.provider'
import { LastPresses } from './LastPresses.provider'
import { LastDrag } from './platform-control-map.component'
import * as controlMap from './control-map.json'
import { ActivatedRoute, Router } from '@angular/router'
import { LastButtonsProvider } from './LastButtons.provider'

interface PlayerMap {
  index: number
  showMap?: boolean
  lastDrag?: LastDrag
}

interface PlayersMap {
  [playerIndex: number]: PlayerMap
}

@Component({
  templateUrl: './platform.component.html',
  providers: [ LastPresses, LastButtonsProvider ]
})
export class PlatformComponent {
  view?: 'json' | 'players' | 'edit'

  editPlatform?: PlatformMap
  viewPlayerMap = false
  controlListen?: Control
  controlMap = controlMap
  platformMap!: PlatformMap

  controlPressListening = false
  controlPressListen?: Control

  dragRowControl?: Control

  lockPlayerMaps: number[] = []
  players: PlayerMap[] = []
  playersMap: PlayersMap = {}

  remapping: {
    active?: boolean
    playerIndex?: number
    index: number
    player: Control[]
    end: () => any
    next: () => any
  } = { index:0, end: () => undefined, next: () => undefined, player: [] }

  constructor(
    public session: SessionProvider,
    public lastPresses: LastPresses,
    public lastButtons: LastButtonsProvider,
    public activatedRoute: ActivatedRoute,
    public router: Router,
  ) {
    // lastButtons.startListening() // removed, don't listen until select input used

    const platformName = this.activatedRoute.snapshot.paramMap.get('platform')
    this.platformMap = session.platformMap.images.find(platform => platform.label === platformName) as PlatformMap

    if ( !this.platformMap ) {
      this.router.navigateByUrl('/inputs/platforms')
    }

    // start with player one open
    this.togglePlayerMapByIndex(0, true)
  }

  async saveChanges() {
    const saveOptions = {
      id: PlatformComponent.name,
      suggestedName: 'platform.map.json',
      /*types: [{
        description: 'JSON',
        accept: {
          'application/json': ['.json'],
        },
      }],*/
    }

    // create a new handle
    const newHandle = await window.showSaveFilePicker(saveOptions)

    // create a FileSystemWritableFileStream to write to
    const writableStream = await newHandle.createWritable()

    const fileString = JSON.stringify(this.session.platformMap, null, 2)
    // write our file
    await writableStream.write( fileString )

    // close the file and write the contents to disk.
    await writableStream.close()
  }

  clonePlatform(platformMap: PlatformMap) {
    const clone = JSON.parse(JSON.stringify(platformMap))
    clone.label = clone.label + ' copy'
    this.session.platformMap.images.push( clone )
    this.platformMap = clone // move platoform selection
    console.log('clone.label', clone.label)
    setTimeout(() =>
      this.router.navigateByUrl(`/inputs/platforms/${encodeURIComponent(clone.label)}`)
    , 1)
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
    this.playersMap[playerIndex].lastDrag = {
      control,
      startOffsetY: 0,
      startOffsetX: 0
    }
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

  setControlColorByPlayerIndex(event: Event, playerIndex: number) {
    const value = (event.target as any).value
    const playerMap = this.playersMap[playerIndex]
    const control: Control = playerMap.lastDrag?.control as any
    control.color = hexToRgb(value)
  }

  unsorted(): any {}

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
    if ( intoIndex === -1 || intoIndex === NaN ) {
      // create new player
      intoIndex = platformMap.players.length
    }

    const newPlayerMap = player.map(control => ({...control}))
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
    this.togglePlayerMap( intoPlayer )
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

  remapPlayerAll(player: Control[]) {
    if ( this.remapping.active ) {
      this.remapping.end()
      return
    }

    const players = this.platformMap?.players
    if ( !players ) {
      return console.warn('no players to remap')
    }
    
    const eventName = 'keydown'
    const playerIndex = players.findIndex(p => p === player) as number
    const realPlayer = players[playerIndex]
    
    const remap = this.remapping = {
      active: true,
      playerIndex,
      index: 0, player: realPlayer,
      end: () => {
        window.removeEventListener(eventName, onKey)
        this.remapping = {...PlatformComponent.prototype.remapping}
        delete this.controlListen
      },
      next: () => {
        ++remap.index
        this.controlListen = realPlayer[remap.index]
        
        if ( remap.index === realPlayer.length ) {
          remap.end()
        }
      }
    }
    
    this.controlListen = player[0]

    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      setTimeout(() => {
        // record
        realPlayer[remap.index].keyName = event.code // string
        realPlayer[remap.index].keyCode = event.keyCode // number
        remap.next()
      }, 0)
    }
    window.addEventListener(eventName, onKey)
  }

  toggleLockPlayerMapByIndex(index: number) {
    const platformMap = this.platformMap
    if ( !platformMap ) {
      return
    }

    const lockIndex = this.lockPlayerMaps.indexOf(index)
    if ( lockIndex >= 0 ) {
      this.deselectPlayerByIndex(index)
      return
    }

    const player = platformMap.players[ index ]
    this.lockPlayerMapByIndex(index)
    this.togglePlayerMap(player)
  }

  unlockPlayerByIndex(index: number) {
    const lockMap = this.lockPlayerMaps
    const lockIndex = lockMap.indexOf(index)
    
    if ( lockIndex < 0 ) {
      return
    }
    
    lockMap.splice(lockIndex, 1)

    // hide from player maps
    const findIndex = this.players.findIndex(player => player.index === index)
    if ( findIndex >= 0 ) {
      lockMap.splice(findIndex, 1)
      return
    }
  }

  lockPlayerMapByIndex(index: number) {
    const platformMap = this.platformMap
    if ( !platformMap ) {
      return
    }
    
    if ( this.lockPlayerMaps.includes(index) ) {
      return // do not add twice
    }
    this.lockPlayerMaps.push(index)
  }

  togglePlayerMapByIndex(
    index: number,
    onlyShow = false
  ) {
    const platformMap = this.platformMap
    if ( !platformMap ) {
      return
    }

    const playerMaps = this.players
    if ( this.playersMap[index] ) {
      this.deselectPlayerByIndex(index)
      return
    }

    if ( onlyShow ) {
      this.players = this.players.filter(p =>
        p.index === index || this.lockPlayerMaps.findIndex(pl => pl === p.index) >= 0
      )
      this.rebuildPlayersMap()
    }

    const player = platformMap.players[ index ]
    this.togglePlayerMap(player)
  }

  deselectPlayerByIndex(index: number) {
    const findIndex = this.players.findIndex(player => player.index === index)
    this.players.splice(findIndex, 1)
    delete this.playersMap[ index ]
    this.unlockPlayerByIndex(index)
  }
  
  togglePlayerMap(player: Control[]) {
    const platformMap = this.platformMap
    if ( !platformMap ) {
      return player
    }

    const index = platformMap.players.findIndex(p => p === player)
    
    if ( this.players.findIndex(p => p.index === index) >= 0 ) {
      return // do not add twice
    }
    
    const playerMap = {index}
    this.playersMap[index] = playerMap
    this.players.push(playerMap)
    this.players.sort()
    
    return player
  }

  rebuildPlayersMap() {
    this.playersMap = this.players.reduce((all, p) => (all[p.index] = {index: p.index}) && all, {} as PlayersMap)
  }

  createPlayerOnControl(players: Control[][]) {
    const newPlayer: Control[] = []
    players.push( newPlayer )
    this.togglePlayerMap(newPlayer)
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

  showAllPlayersOf(platformMap: PlatformMap) {
    this.players = platformMap.players.map((_p, index) => ({index}))
    this.rebuildPlayersMap()
  }

  toggleEditPlatform(platform: PlatformMap) {
    if ( this.editPlatform === platform ) {
      delete this.view
      delete this.editPlatform
      return
    }
    
    this.view='edit'
    this.editPlatform = platform
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  var result: any = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ]
}
