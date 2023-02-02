import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { SessionProvider } from '../session.provider'
import windowsKeys from '../inputs/windowsKeys.json'
import gamepad from '../inputs/gamepad.json'
import { PlatformMap } from '../platforms'
import { LastPresses } from '../inputs/LastPresses.provider'
import { Remap } from '../inputs/platform-control-map.component'
import { DirectoryManager, DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { LastButtonsProvider } from '../inputs/LastButtons.provider'
import { animations } from 'ack-angular-fx'
import { Prompts } from 'ack-angular'
import { firstValueFrom, Subscription } from 'rxjs'

interface GamePadButtons {
  [index: string]: boolean // true IF is axis
}

@Component({
  animations,
  templateUrl: './xinput-mapping.component.html',
  providers: [ LastPresses, LastButtonsProvider ],
}) export class XinputMappingComponent {
  fileName!: string
  windowsKeys: { code: string, num: number, description: string}[] = windowsKeys
  platform: PlatformMap
  nextKeyListening?: ButtonParameters
  gamepad: GamePadButtons = gamepad
  
  file?: DmFileReader
  json?: XInputFile
  playerArray: PlayerInput[] = []
  editRow?: ButtonParameters
  viewJson?: boolean
  mapDir?: DirectoryManager

  subs = new Subscription()

  constructor(
    public activatedRoute: ActivatedRoute,
    public session: SessionProvider,
    public router: Router,
    public lastPresses: LastPresses,
    public lastButtons: LastButtonsProvider,
    public prompts: Prompts,
  ){
    this.platform = session.platforms.images.find(platform => platform.label === 'Xbox' || (platform.label.includes('x') && platform.label.includes('box'))) as PlatformMap

    // if a file is saved of the same name then lets clear any saved indicators of changes
    this.subs.add(
      this.session.$filesSaved.subscribe(files => {
        files.forEach(x => {
          if ( x.file.name === this.fileName ) {
            this.playerArray.forEach(player => {
              Object.values(player.keys).forEach(key => {
                key.changed = false
              })
            })
          }
        })
      })
    )
  }

  ngOnInit(){
    const fileName = this.getFileName()

    if ( !fileName || !this.session.xarcadeDirectory ) {
      this.router.navigateByUrl('🕹/xarcade-xinput')
    }

    this.loadMapping(fileName as string)
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  getFileName() {
    return this.fileName = this.activatedRoute.snapshot.paramMap.get('fileName') as string
  }

  // for pipe keyvalue to maintain order
  buttonSort(x: any, y: any): number {
    return x.value.button.localeCompare(y.value.button)
  }

  async loadMapping( fileName: string ) {
    if ( !this.session.xarcadeDirectory ) {
      this.session.warn('Please select Xarcade Input directory to continue')
      return
    }
    
    // fileName = fileName + '.json'
    const path = 'xarcade-xinput/mappings'
    this.mapDir = await this.session.xarcadeDirectory.getDirectory(path)
    this.file = await this.mapDir.findFileByPath(fileName)
    
    if ( !this.file ) {
      this.session.warn(`Cannot find file ${path}/${fileName}`)
      return
    }
    
    this.json = await this.file.readAsJson() as any
    this.reloadPlayerArray(this.json as any)
  }

  keyNameToNum(key: string) {
    return this.windowsKeys.find(x => x.code === key)?.num
  }

  reloadPlayerArray(json: XInputFile) {
    this.playerArray = Object.entries(json).reduce((all, [key, value]: [string, [number, string]]) => {
      const playerIndex = value[0]
      
      if ( !all[ playerIndex ] ) {
        all[ playerIndex ] = {
          json: {},
          playerIndex,
          keys: {},
          remap: [],
          duplicates: [],
        } as PlayerInput
      }
      
      const rightValues = value.slice(1, value.length) as (string | number)[]
      all[ playerIndex ].keys[ key ] = all[ playerIndex ].keys[ key ] || []
      const buttonParams: ButtonParameters = {
        key,
        num: this.keyNameToNum(key),
        button: rightValues[0] as string,
        parameters: rightValues.slice(1, rightValues.length) as number[]
      }
      all[ playerIndex ].json[key] = value

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
      .filter(x => x) // remove undefined players
  }

  reloadRemaps() {
    this.playerArray.forEach(player => {
      player.remap = []
      player.json = {}

      Object.entries(player.keys).forEach(([key, value]) => {
        player.json[key] = value
        player.remap.push({
          label: value.button,
          keyName: value.key,
          keyCode: value.num as number,
        })
      })
    })
  }

  updateJson() {
    this.json = this.playerArray.reduce((result, player) => {
      Object.entries(player.keys).forEach(([key, value]) => {
        result[ key ] = [ player.playerIndex, value.button, ...value.parameters ] as any
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
    keys[ newKey ] = keys[ oldKey ] || {}
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
    // find a missing button or default
    const buttonName = missingButtonName || 'untitled-' + Object.keys(player.keys).length

    player.keys[ buttonName ] = params
    this.editRow = params
  }
  
  duplicates: ButtonParameters[] = []
  getDuplicates(): ButtonParameters[] {
    this.duplicates.length = 0
    this.playerArray.forEach(player => {
      const seen: ButtonParameters[] = []
      player.duplicates = []

      Object.values(player.keys).forEach(value => {
        const dup = seen.find(x => x.button === value.button)
        value.duplicate = dup ? true : false
        if ( dup ) {
          dup.duplicate = true // mark the seen was as a duplicate itself
          player.duplicates.push(value)
          this.duplicates.push(value)
          return
        }

        seen.push( value )
      })
    })

    return this.duplicates
  }

  async save() {
    if ( !this.file ) {
      return
    }

    this.updateJson()
    const duplicates = this.getDuplicates()
    if ( duplicates.length ) {
      const confirm = await firstValueFrom( this.prompts.confirm('⚠️ Duplicates found! Do you wish to continue anyway?') )

      if ( !confirm ) {
        return
      }
    }
    
    const fileString = this.getWriteString()
    this.session.toSaveFiles.push({
      file: this.file,
      string: fileString,
    })
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

  press(btn: ButtonParameters) {
    if ( btn.num ) {
      this.lastPresses.pressedObject[btn.num] = {code: btn.num, key: btn.key}
    }

    if ( btn.button ) {
      const code = getCodeByButton(btn)
      this.lastButtons.pressedObject[ code ] = {
        id: '', // gamepad id
        code,
        gamepadIndex: -1,
      }
    }
  }
  
  unpress(btn: ButtonParameters) {
    if ( btn.num ) {
      delete this.lastPresses.pressedObject[btn.num]
    }

    if ( btn.button ) {
      const code = getCodeByButton(btn)
      delete this.lastButtons.pressedObject[ code ]
    }
  }

  addPlayer() {
    const player: PlayerInput = {
      playerIndex: this.playerArray.length,
      keys: {},
      remap: [],
      duplicates: [],
      json: {},
    }
    this.playerArray.push(player)
  }

  remove(object: any, key: string) {
    delete object[key]
  }

  renameTo(name: string) {
    if ( !this.file ) {
      this.session.warn('#renameTo this.file is not defined')
      return
    }

    const fromName = this.file.name
    
    if ( name === fromName ) {
      return // name has not changed
    }

    this.file?.directory.renameFile(fromName, name)
  }

  changeKey(keyvalue: {key: string, value: ButtonParameters}) {
    const newNum = this.keyNameToNum(keyvalue.key)
    
    if ( keyvalue.value.num === newNum ) {
      return // not actually changed
    }

    keyvalue.value.num = newNum
    keyvalue.value.changed = true
    this.getDuplicates()
  }

  focusFileName() {
    document.getElementById('map-file-name')?.focus()
  }
}

interface PlayerInput {
  playerIndex: number
  keys: PlayerKeys
  remap: Remap[]
  
  view?: 'json'
  duplicates: ButtonParameters[]
  json: Record<string, any>
}

interface PlayerKeys {
  [keyName: string]: ButtonParameters // keyName examples LShiftKey, D5, Down
}

interface ButtonParameters {
  key: string
  num?: number // aka keyCode number
  button: string
  parameters: number[]
  duplicate?: boolean
  changed?: boolean
}

interface XInputFile {
  [buttonName: string]: [
    number, // player index
    string
  ]
}

function getCodeByButton(btn: ButtonParameters) {
  if ( btn.parameters.length || btn.button.includes('StickY') || btn.button.includes('StickX') ) {
    return btn.button + (btn.parameters.join('_') || '1')
  }
  
  return btn.button
}