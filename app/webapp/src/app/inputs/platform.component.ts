import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { Control, PlatformMap } from '../platforms'
import { SessionProvider } from '../session.provider'
import { LastPresses } from './LastPresses.provider'
import { ActivatedRoute, Router } from '@angular/router'
import { LastButtonsProvider } from './LastButtons.provider'

import * as controlMap from './control-map.json'
import { LastDrag, PlayerMap, PlayersMap } from './platform.utils'

@Component({
  templateUrl: './platform.component.html',
  providers: [ LastPresses, LastButtonsProvider ],
  animations,
})
export class PlatformComponent {
  view?: 'json' | 'players' | 'edit'

  editPlatform?: PlatformMap
  controlListen?: Control
  controlMap = controlMap
  platformMap!: PlatformMap

  lockPlayerMaps: number[] = []
  players: PlayerMap[] = []
  playersMap: PlayersMap = {}
  
  lastDrag?: LastDrag // a shared drag object across all platforms and players

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
    this.reload()
  }

  reload() {
    const platformName = this.activatedRoute.snapshot.paramMap.get('platform')
    this.platformMap = this.session.platforms.images.find(platform => platform.label === platformName) as PlatformMap

    if ( !this.platformMap ) {
      this.router.navigateByUrl('/🕹/platforms')
    }

    const playerIndex = this.activatedRoute.snapshot.queryParams['playerIndex']
    if ( playerIndex != undefined ) {
      this.toggleLockPlayerMapByIndex(playerIndex)
    } else {
      // start with player one open
      this.togglePlayerMapByIndex(0, true)
    }
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

    const fileString = JSON.stringify(this.session.platforms, null, 2)
    // write our file
    await writableStream.write( fileString )

    // close the file and write the contents to disk.
    await writableStream.close()
  }

  clonePlatform(platformMap: PlatformMap) {
    const clone = JSON.parse(JSON.stringify(platformMap))
    clone.label = clone.label + ' copy'
    this.session.platforms.images.push( clone )
    this.platformMap = clone // move platoform selection
    setTimeout(() =>
      this.router.navigateByUrl(`/🕹/platforms/${encodeURIComponent(clone.label)}`)
    , 1)
  }

  remapPlayerAll(player: Control[]) {
    if ( this.remapping.active ) {
      this.remapping.end()
      return
    }

    const players = this.platformMap?.players
    if ( !players ) {
      return this.session.warn('no players to remap')
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

  addButtonToPlayer(index: number, players: Control[][]) {
    const newButton = {
      keyName: '',
      x: players.length,
      y:0,
      width:4,
      height:4
    }
    
    players[index].push(newButton)
  }

  clickSelectFile() {
    const elm = document.getElementById('select-platform-file')
    if ( !elm ) {
      this.session.warn('cannot location select platform file input')
      return
    }
    elm.click()
  }

  fileSelect(event: any) {
    var fileList: File[] = event.__files_ || (event.target && event.target.files)

    if (!fileList) return;

    this.stopEvent(event)    
    for (let index = fileList.length - 1; index >= 0; --index) {
      const file = fileList[index]
      const reader = new FileReader()
      reader.readAsText(file)
      reader.onload = () => {
        const string = reader.result as string
        this.session.platforms = JSON.parse(string)
        this.session.reloadPlatforms()
        this.reload()
      }
    }
  }

  stopEvent(event: any) {
    event.preventDefault()
    event.stopPropagation()
  }
}
