import { Component, Inject } from '@angular/core'
import { ActivatedRoute, Route, Router } from '@angular/router'
import { SessionProvider } from './session.provider'
import windowsKeys from './windowsKeys.json'
import gamepad from './gamepad.json'
import platforms from './platform.map.json'
import { PlatformMap } from './platforms'
import { LastPresses } from './inputs/LastPresses.provider'
import { Remap } from './inputs/platform-control-map.component'
import { xarcadeXinputPickerId } from './xarcade-xinput.component'
import { DmFileReader } from './DirectoryManagers'

interface GamePadButtons {
  [index: string]: boolean // true IF is axis
}

@Component({
  templateUrl: './xinput-mapping.component.html',
  providers: [ LastPresses ],
}) export class XinputMappingComponent {
  window = window as any
  windowsKeys: { code: string, num: number, description: string}[] = windowsKeys
  platform = platforms.images.find(platform => platform.label === 'Xbox' || (platform.label.includes('x') && platform.label.includes('box'))) as PlatformMap
  nextKeyListening?: ButtonParameters
  gamepad: GamePadButtons = gamepad
  
  file?: DmFileReader
  json?: XInputFile
  playerArray: PlayerInput[] = []
  editRow?: ButtonParameters

  constructor(
    public activatedRoute: ActivatedRoute,
    public session: SessionProvider,
    public router: Router,
    public lastPresses: LastPresses,
  ){}

  ngOnInit(){
    const fileName = this.getFileName()

    if ( !fileName || !this.session.xarcadeDirectory ) {
      this.router.navigateByUrl('/inputs/xarcade-xinput')
    }

    this.loadMapping(fileName as string)
  }

  getFileName() {
    return this.activatedRoute.snapshot.paramMap.get('fileName')
  }

  // for pipe keyvalue to maintain order
  buttonSort(x: any, y: any): number {
    return x.value.button.localeCompare(y.value.button)
  }

  async loadMapping( fileName: string ) {
    if ( !this.session.xarcadeDirectory ) {
      return
    }
    
    const mapDir = await this.session.xarcadeDirectory.getDirectory('xarcade-xinput/mappings')
    this.file = await mapDir.findFileByPath(fileName)

    if ( !this.file ) {
      return
    }

    this.json = await this.file.readAsJson() as any
    this.reloadPlayerArray(this.json as any)
  }

  reloadPlayerArray(json: XInputFile) {
    this.playerArray = Object.entries(json).reduce((all, [key, value]: [string, [number, string]]) => {
      const playerIndex = value[0]
      
      if ( !all[ playerIndex ] ) {
        while( all.length <= playerIndex ) {
          all[ all.length ] = all[ all.length ] || {playerIndex, keys: {}, remap: []} as PlayerInput
        }
      }
      
      const rightValues = value.slice(1, value.length) as (string | number)[]
      all[ playerIndex ].keys[ key ] = all[ playerIndex ].keys[ key ] || []
      const buttonParams: ButtonParameters = {
        key,
        num: this.windowsKeys.find(x => x.code === key)?.num,
        button: rightValues[0] as string,
        parameters: rightValues.slice(1, rightValues.length) as number[]
      }

      if ( buttonParams.num ) {
        all[ playerIndex ].remap.push({
          label: buttonParams.button,
          keyName: buttonParams.key,
          keyCode: buttonParams.num,
        })
      }

      all[ playerIndex ].keys[ key ] = buttonParams
      
      return all
    }, [] as PlayerInput[])
  }

  reloadRemaps() {
    this.playerArray.forEach(player => {
      player.remap = []
      Object.values(player.keys).forEach(key => {
        player.remap.push({
          label: key.button,
          keyName: key.key,
          keyCode: key.num as number,
        })
      })
    })
  }

  updateJson() {
    this.json = this.playerArray.reduce((result, player) => {
      Object.values(player.keys).forEach(key => {
        const keyName: any = key.key
        result[ keyName ] = [ player.playerIndex, key.button, ...key.parameters ] as any
      })
      return result
    }, {} as XInputFile)
  }

  changePlayerButtonKey(
    keys: PlayerKeys,
    oldKey: string,
    keyCode: number
  ) {
    const match = this.windowsKeys.find(info => info.num === keyCode)
    if ( !match ) {
      return // not found
    }
    
    const newKey = match.code // string example LControlKey
    keys[ newKey ] = keys[ oldKey ]
    keys[ newKey ].num = keyCode
    
    if ( newKey !== oldKey ) {
      delete keys[ oldKey ]
    }

    // cause remap to redraw
    this.reloadRemaps()
  }

  addPlayerButton(player: PlayerInput) {
    const params: ButtonParameters = {
      key: '',
      button: '',
      parameters: [],
    }

    const missingButtonName = Object.keys(gamepad).find(buttonName => !player.keys[ buttonName ])

    /*if ( missingButtonName ) {
      params.button = missingButtonName
      console.log('missingButtonName', missingButtonName, player.keys[missingButtonName as any])
      console.log('player.keys', player.keys)
    }*/

    // find a missing button or default
    const buttonName = missingButtonName || 'untitled-' + Object.keys(player.keys).length

    player.keys[ buttonName ] = params
  }

  async save() {
    if ( !this.file ) {
      return
    }
    
    this.updateJson()
    // const fileString = JSON.stringify(this.json, null, 2)
    const fileString = this.getWriteString()
    await this.file.write(fileString)
  }

  getWriteString() {
    let fileString = JSON.stringify(this.json).replace(/\],/g,'],\n')
    const tab = '  '
    const nl = '\n' + tab
    
    // add tabbing
    fileString = fileString.replace(/\n/g, nl)
    this.playerArray.forEach(player => {
      //{"LControlKey":[0,"X"]
      const regx = new RegExp('([^"]*)"([^"]+)":([^\\[]*)\\[' + player.playerIndex, 'i')
      fileString = fileString.replace(regx, `$1${nl}"$2":[${player.playerIndex}`)
    })
    
    // last item split apart
    return fileString = fileString.replace(/\]\}/g,']\n}')
  }
}
interface PlayerInput {
  playerIndex: number
  keys: PlayerKeys
  remap: Remap[]
}

interface PlayerKeys {
  [keyName: string]: ButtonParameters // keyName examples LShiftKey, D5, Down
}

interface ButtonParameters {
  key: string
  num?: number // aka keyCode number
  button: string
  parameters: number[]
}

interface XInputFile {
  [buttonName: string]: [
    number, // player index
    string
  ]
}