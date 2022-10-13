import { Component } from '@angular/core'
import platformMap from './platform.map.json'
import * as controlMap from './control-map.json'

export class Control {
  index!: number
  keyCode?: string // keyboard key
  shape?: 'square' | 'circle'
  emoji?: string
  label?: string
  color?: number[] // [number, number, number]
  
  x!: number // percent
  y!: number // percent
  width?: number // percent
  height?: number // percent
}

class PlatformMap {
  url!: string
  label!: string
  players!: Control[][] // 1, 2, 3, 4
}

export class PlatformsMapping {
  images!: PlatformMap[]
}

export class LastDrag {
  // event!: DragEvent
  control!: Control
  startOffsetY!: number
  startOffsetX!: number
}

export class Reads {
  editPlatform?: PlatformMap
  viewPlatformJson?: PlatformMap
  controllerSize = 16
  pressListening = false
  controlPressListening = false
  controlPressListen?: Control
  viewPlayerMap = false
  platformMap?: PlatformMap
  viewButtonMap = false
  
  lockPlayerMaps: number[] = []
  playerMaps: number[] = []

  remapping?: {
    playerIndex: number
    index: number
    player: Control[]
    end: () => any
  }

  lastPress?: {
    which: number
    code: string
    key: string
    mappings?: string[]
  }

  lastDrag?: LastDrag
}

@Component({
  templateUrl: './keyboard.component.html',
})
export class KeyboardComponent {
  window = window as any
  controlMap = controlMap
  platformMap: PlatformsMapping = platformMap as any
  reads: Reads = new Reads() // catch all of data 
  onKeyUp = (event: KeyboardEvent): void => this.keyUp(event)
  onKeyDown = (event: KeyboardEvent): void => this.keyDown(event)

  constructor() {
    this.window.addEventListener('keyup', this.onKeyUp)
    this.window.addEventListener('keydown', this.onKeyDown)
  }

  ngOnDestroy(){
    this.window.removeEventListener('keyup', this.onKeyUp)
    this.window.removeEventListener('keydown', this.onKeyDown)
  }

  keyUp = (event: KeyboardEvent) => {
    // event.preventDefault()
    delete this.reads.lastPress
  }
  
  keyDown = (event: KeyboardEvent) => {
    // event.preventDefault()
    const searchKey = event.code
    const map = Object.entries(controlMap).find(([key]) => key == searchKey)
    this.reads.lastPress = {
      which: event.which,
      code: event.code,
      key: event.key,
      mappings: map ? map[1] : undefined,
    }
  }

  dropLastDrag($event: DragEvent) {
    const lastDrag = this.reads.lastDrag as LastDrag
    const offsetX = $event.offsetX - lastDrag.startOffsetX
    const offsetY = $event.offsetY - lastDrag.startOffsetY
    
    const target = $event.target as Element
    const dropWidth = target.clientWidth
    const dropHeight = target.clientHeight
    const widthPercent = offsetX / dropWidth * 100
    const heightPercent = offsetY / dropHeight * 100

    lastDrag.control.x = widthPercent
    lastDrag.control.y = heightPercent
  }

  async saveChanges() {
    // create a new handle
    const newHandle = await this.window.showSaveFilePicker({
      suggestedName: 'platform.map.json',
      types: [{
        description: 'JSON',
        accept: {
          'application/json': ['.json'],
        },
      }],
    })

    // create a FileSystemWritableFileStream to write to
    const writableStream = await newHandle.createWritable()

    const fileString = JSON.stringify(platformMap, null, 2)
    // write our file
    await writableStream.write( fileString )

    // close the file and write the contents to disk.
    await writableStream.close()
  }

  selectControlColor(event: Event) {
    const value = (event.target as any).value
    const control: Control = this.reads.lastDrag?.control as any
    control.color = hexToRgb(value)
  }

  unsorted(): any {}

  duplicatePlayerButton(
    player: Control[],
    control: Control
  ) {
    const lastDrag = this.reads.lastDrag as any
    const newControl = lastDrag.control = {...control}
    newControl.label += ' - copy'
    ++newControl.x
    ++newControl.y
    player.push(newControl)
  }

  copyPlayerToPlayerByEvent(player: Control[], event: Event) {
    let intoIndex = Number( (event as any).target.value )

    const platformMap = this.reads.platformMap as PlatformMap
    if ( intoIndex === -1 || intoIndex === NaN ) {
      // create new player
      intoIndex = platformMap.players.length
    }

    const newPlayerMap = player.map(control => ({...control}))
    platformMap.players[intoIndex] = platformMap.players[intoIndex] || []
    platformMap.players[intoIndex].push(...newPlayerMap)

    // goto that player
    this.viewPlayerMap( platformMap.players[intoIndex] )
  }

  removePlayerButtonFromMap(
    control: Control,
    player: Control[]
  ) {
    const toRemoveIndex = player.findIndex(x => x === control)
    player.splice(toRemoveIndex, 1)
    if ( this.reads.lastDrag?.control === control ) {
      delete this.reads.lastDrag
    }
  }

  remapPlayerAll(player: Control[]) {
    const playerIndex = this.reads.platformMap?.players.findIndex(p => p === player) as number
    const remap = this.reads.remapping = {
      playerIndex,
      index: 0, player,
      end: () => {
        this.window.removeEventListener('keydown', onKeyDown)
        delete this.reads.remapping
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      const index = remap.index
      const controls = remap.player
      controls[index].keyCode = event.code

      ++remap.index

      if ( remap.index === remap.player.length ) {
        remap.end()
      }
    }
    this.window.addEventListener('keydown', onKeyDown)
  }

  toggleLockPlayerMapByIndex(index: number) {
    const platformMap = this.reads.platformMap
    if ( !platformMap ) {
      return
    }

    const playerMaps = this.reads.lockPlayerMaps
    const lockIndex = playerMaps.indexOf(index)
    if ( lockIndex >= 0 ) {
      this.unlockPlayerByIndex(index)
      return
    }

    const player = platformMap.players[ index ]
    this.lockPlayerMapByIndex(index)
    this.viewPlayerMap(player)
  }

  unlockPlayerByIndex(index: number) {
    const playerMaps = this.reads.lockPlayerMaps
    const lockIndex = playerMaps.indexOf(index)
    
    if ( lockIndex < 0 ) {
      return
    }
    
    playerMaps.splice(lockIndex, 1)

    // hide from player maps
    const findIndex = this.reads.playerMaps.indexOf(index)
    if ( findIndex >= 0 ) {
      playerMaps.splice(findIndex, 1)
      return
    }
  }

  lockPlayerMapByIndex(index: number) {
    const platformMap = this.reads.platformMap
    if ( !platformMap ) {
      return
    }
    
    if ( this.reads.lockPlayerMaps.includes(index) ) {
      return // do not add twice
    }
    this.reads.lockPlayerMaps.push(index)
  }

  togglePlayerMapByIndex(
    index: number,
    onlyShow = false
  ) {
    const platformMap = this.reads.platformMap
    if ( !platformMap ) {
      return
    }

    const playerMaps = this.reads.playerMaps
    const findIndex = playerMaps.indexOf(index)
    if ( findIndex >= 0 ) {
      playerMaps.splice(findIndex, 1)
      this.unlockPlayerByIndex(index)
      return
    }

    if ( onlyShow ) {
      this.reads.playerMaps = this.reads.playerMaps.filter(p =>
        p === index || this.reads.lockPlayerMaps.findIndex(pl => pl === p) >= 0
      )
    }

    const player = platformMap.players[ index ]
    this.viewPlayerMap(player)
  }
  
  viewPlayerMap(player: Control[]) {
    const platformMap = this.reads.platformMap
    if ( !platformMap ) {
      return player
    }

    const index = platformMap.players.findIndex(p => p === player)
    
    if ( this.reads.playerMaps.includes(index) ) {
      return // do not add twice
    }
    
    this.reads.playerMaps.push(index)
    this.reads.playerMaps.sort()
    
    return player
  }

  createPlayerOnControl(players: Control[][]) {
    const newPlayer: Control[] = []
    players.push( newPlayer )
    this.viewPlayerMap(newPlayer)
  }

  toggleSelectedControl(control: Control) {
    if ( this.reads.lastDrag?.control === control ) {
      delete this.reads.lastDrag
      return control
    }

    return this.showControl(control)
  }

  showControl(control: Control) {
    this.reads.controlPressListening = false
    delete this.reads.controlPressListen
    return this.reads.lastDrag = {
      control,
      startOffsetY: 0,
      startOffsetX: 0
    }
  }

  showAllPlayersOf(platformMap: PlatformMap) {
    this.reads.playerMaps = platformMap.players.map((_p, i) => i)
  }

  clonePlatform(platformMap: PlatformMap) {
    const clone = JSON.parse(JSON.stringify(platformMap))
    clone.label = clone.label + ' copy'
    this.platformMap.images.push( clone )
    this.reads.platformMap = clone // move platoform selection
    this.reads.editPlatform = clone //  put into edit mode
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
