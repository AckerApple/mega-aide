import { DirectoryManager, DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, EMPTY, firstValueFrom, from, mergeMap, Observable, of, shareReplay, switchMap } from "rxjs"
import { SessionProvider } from "../session.provider"
import { InputsMap, ControlDefault, elmAttributesToObject, Emulator, getControlDefaultsByControlXml, getElementsByTagName, getEmulatorsByControl, getLastLayoutFileByLightsConfig, getLightConfigByLayoutFile, IniNameValuePairs, iniToObject, LedBlinkyControls, NewControlGroupings, NewEmulator, Port, PortDetails, UniqueInputCode, UniqueInputLabel, LedController, LedControllerDetails } from "./LedBlinky.utils"

enum LEDBlinkyFiles {
  UnknownGames = 'UnknownGames.dat',
  NewInputCodes = 'NewInputCodes.ini',
  Color_RGB = 'Color-RGB.ini',
  LEDBlinkyAnimationEditor = 'LEDBlinkyAnimationEditor.ini',
  LEDBlinkyControls = 'LEDBlinkyControls.xml',
  LEDBlinkyInputMap = 'LEDBlinkyInputMap.xml',
  // maps things like P3B2=KEYCODE_RSHIFT
  LEDBlinkyConfigWizard = 'LEDBlinkyConfigWizard.ini',
}

interface Size {
  width: number
  height: number
}

const displaySizes: Size[] = [
  {width:640, height:480}, // 1
  {width:1024, height:768}, // 2
  {width:1280, height:960}, // 3
]

export class LedBlinky {
  // directory?: DirectoryManager
  directoryChange = new BehaviorSubject<DirectoryManager | undefined>( undefined )
  directory$ = this.directoryChange.pipe(
    switchMap(c => c ? of(c) : EMPTY),
    shareReplay(1),
  )
  
  displaySize?: Size
  pickerId = 'ledBlinkyPicker'
  controls?: LedBlinkyControls // TODO: memory intensive to leave this hanging around

  // emulator?: Emulator | NewEmulator
  emulator$ = new BehaviorSubject<NewEmulator | Emulator | undefined>( undefined )

  // custom to this app
  zoom: number = 1.5
  zoom$ = new BehaviorSubject<number>(1.5)

  colors?: IniNameValuePairs
  colors$ = this.directoryChange.pipe(
    mergeMap(directory => {
      if ( !directory ) {
        return from(Promise.resolve({}))
      }
  
      const iniFileName = LEDBlinkyFiles.Color_RGB
      return from(new Promise<IniNameValuePairs>(async (res, rej) => {
        const fxEditorConfig = await directory.findFileByPath(iniFileName)
        
        if ( !fxEditorConfig ) {
          this.session.warn(`Cannot load colors$ ${directory.path} ${iniFileName}`)
          res({})
          return {} as IniNameValuePairs
        }
    
        const config = await fxEditorConfig.readAsText()
        const configObject = iniToObject(config)['Colors']
        this.colors = configObject
        // this.getColorRgbConfig = async () => this.colors
        res(this.colors)
        return this.colors
      }))
    }),
    shareReplay(1),
  )

  newInputCodesFile$ = this.getFileLoader(LEDBlinkyFiles.NewInputCodes)
  newInputCodes$ = this.newInputCodesFile$.pipe(
    mergeMap(file =>
      from(this.getNewInputCodes(file))
    ),
    shareReplay(1),
  )


  animEditorObjectFile$ = this.getFileLoader(LEDBlinkyFiles.LEDBlinkyAnimationEditor)
  animEditorObject$ = this.animEditorObjectFile$.pipe(
    mergeMap(file => this.getAnimEditorObject(file))
  )

  constructor(public session: SessionProvider) {}

  private async getNewInputCodes(
    newInputCodeFile: DmFileReader
  ) {
    const config = await newInputCodeFile.readAsText()
    const configObject = iniToObject(config)['InputCodes']
    return configObject
  }

  // configWiz?: ConfigWiz
  /*
  configWizard$: Observable<ConfigWiz | undefined> = this.directory$.pipe(
    mergeMap(directory => from(this.getConfigWizard(directory)))
  )

  async getConfigWizard(directory: DirectoryManager): Promise<ConfigWiz | undefined> {
    const iniFileName = LEDBlinkyFiles.LEDBlinkyConfigWizard
    const fxEditorConfig = await directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)
    return configObject as ConfigWiz
  }
  */

  async getAnimEditorObject(file: DmFileReader) {
    const config = await file.readAsText()
    const configObject = iniToObject(config)['Settings']
    this.displaySize = displaySizes[ Number(configObject['DisplaySize']) - 1 ]
    return configObject
  }

  /*lightLayoutByName$ = (name: string) => this.directory$.pipe(
    mergeMap(directory => from(this.getLightLayoutByName(directory, name)))
  )*/

  async getLightLayoutByName(
    directory: DirectoryManager,
    relativeFileName: string,
  ) {
    const layoutFile = await directory.findFileByPath(relativeFileName)

    if ( !layoutFile ) {
      this.session.warn(`Cannot load #loadLightLayoutByName ${directory.path} ${relativeFileName}`)
      return
    }
    
    const layoutConfig = await getLightConfigByLayoutFile(layoutFile)
    this.session.debug('🗺 ⚙️ Loaded layoutConfig', layoutConfig)
    return layoutConfig  
  }

  getFxEditorByDir(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs,
  ) {
    // get relative file path to layout file
    const relativeFile = getLastLayoutFileByLightsConfig(animEditorObject)
    const promise = this.getLightLayoutByName(directory, relativeFile)
    return promise
  }

  async loadFileByDir(
    fileName: LEDBlinkyFiles,
    dir: DirectoryManager,
  ) {
    const file = await dir.findFileByPath(fileName)
    return { dir, file }
  }

  controlsFile$ = this.getFileLoader(LEDBlinkyFiles.LEDBlinkyControls)
  inputsMapFile$ = this.getFileLoader(LEDBlinkyFiles.LEDBlinkyInputMap)
  inputsMap$: Observable<InputsMap> = this.inputsMapFile$.pipe(
    mergeMap(file => from(this.getInputsMapByDir(file))),
    shareReplay(1)
  )

  controls$: Observable<LedBlinkyControls | undefined> = combineLatest([
    this.inputsMap$,
    this.controlsFile$,
  ]).pipe(
    mergeMap(([inputsMap, controlsFile]) => {
      if ( !inputsMap ) {
        return of()
      }
      return from(
        this.getControlsByDir(inputsMap, controlsFile)
      )
    })
  )

  unknownGamesFile$ = this.getFileLoader(LEDBlinkyFiles.UnknownGames)
  unknownGames$: Observable<NewEmulator[] | undefined> = this.unknownGamesFile$.pipe(
    mergeMap(datFile => from(
      this.getUnknownGamesByDat(datFile)
    ))
  )

  getFileLoader(file: LEDBlinkyFiles) {
    return this.directory$.pipe(
      mergeMap(dir => from(this.loadFileByDir(file, dir))),
      switchMap(result => {      
        if ( !result.file ) {
          const directory = result.dir
          this.session.warn(`cannot find file ${directory.path} ${file}`)
          return EMPTY
        }
  
        return of(result.file)
      }),
    )
  }

  async getControlsByDir(
    inputsMap: InputsMap,
    controlsFile: DmFileReader,
  ) {   
    const [xml] = await Promise.all([
      controlsFile.readAsXml()
    ])
    
    if ( !inputsMap ) {
      return // a log warning was already fired
    }

    const colorRgbConfig = await firstValueFrom(this.colors$)
    const controlDefaults = getControlDefaultsByControlXml(xml, colorRgbConfig)
    const colors = await firstValueFrom( this.colors$ )// await this.getColorRgbConfig()
    const emulators = getEmulatorsByControl(xml, inputsMap, controlDefaults, colors)

    this.controls = {
      inputsMap, xml,
      emulators,
      controlDefaults
    }

    const mame = controlDefaults.find(x => x.details.groupName === 'MAME')
    if ( mame ) {
      this.controls.availMap = await getAvailControlsMap(inputsMap, mame)
    }

    return this.controls
  }

  async getInputsMapByDir(
    inputsMapFile: DmFileReader
  ) {
    const labels: UniqueInputLabel[] = []
    const inputCodes: UniqueInputCode[] = []

    const xml = await inputsMapFile.readAsXml()
    const ledControllers = getElementsByTagName(xml, 'ledController').map(element => {
      const ports: Port[] = getElementsByTagName(element, 'port').map(mapPortElm)
      ports.forEach(port => registerPorts(port, labels, inputCodes))
      const details = elmAttributesToObject(element) as LedControllerDetails
      const control: LedController = {
        element, ports, details
      }
      return control
    })

    const result: InputsMap = {
      labels, inputCodes, ledControllers
    }
  
    return result  
  }

  async getUnknownGamesByDat(datFile: DmFileReader): Promise<NewEmulator[]> {
    const text = await datFile.readAsText()
    const lines = text.split(/\n|\r/)
    return lines.reduce((all, line) => {
      if ( !line.includes('|') ) {
        return all
      }
      
      const [emuname, gameName] = line.split('|')
      let emuIndex = all.findIndex(one => one.details.emuname === emuname)

      if ( emuIndex < 0 ) {
        const newEmu: NewEmulator = {
          details: { emuname },
          controlGroups: []
        }
        emuIndex = all.length
        all.push(newEmu)
      }

      const game: NewControlGroupings = {
        // groupName: emuname,
        groupName: gameName,
        controlGroups: [{
          details: {
            groupName: gameName,
          },
          players: [],
        }]
      }
      all[emuIndex].controlGroups.push(game)

      return all
    }, [] as NewEmulator[])
  }
}

interface ConfigWiz {
  [name: string]: IniNameValuePairs;
}

export interface AvailControlsMap {
  [playerIndex: string]: {
    name: string
    inputCode: string
  }[]
}

function getAvailControlsMap(
  inputsMap: InputsMap,
  controlDefaults: ControlDefault,
) {
  const uniqueNames: {
    [player: string]: {
      [name: string]: string[]
    }
  } = {}
  
  controlDefaults.controls.forEach(x => {
    const name = x.details.name
    if ( !x.inputCodes || name.charAt(0) === '_' ) {
      return
    }

    const playerIndex = x.details.allowConfigPlayerNum

    if ( !playerIndex ) {
      return
    }

    const uniquePlayer = uniqueNames[playerIndex] = uniqueNames[playerIndex] || {}
    const keyCodes = uniquePlayer[name] = uniquePlayer[name] || []
    const newCodes = x.inputCodes.filter((x: string) => !keyCodes.includes(x))
    keyCodes.push( ...newCodes )
  })

  const all: AvailControlsMap = {}

  Object.entries(uniqueNames).forEach(([playerIndex, controls]) => {
    all[playerIndex] = []
    Object.entries(controls).forEach(([name, inputCodes]) => {
      const isNameMatch = name.slice(0,2) === 'P' + playerIndex || name.charAt(name.length-1) === playerIndex

      let found: UniqueInputCode | undefined = inputsMap.inputCodes.find(x => {
        const isPlayerMatch = x.labels.find(label =>
          label.slice(0,2) === 'P' + playerIndex ||
          label === 'JOYSTICK' + playerIndex
        )

        // const codeMatch = x.inputCode && inputCodes.find(code => code === x.inputCode)

        if ( isPlayerMatch && isNameMatch ) {
          return x
        }
        
        const isCommon = playerIndex === '0' // && !isPlayerMatch
        if ( isCommon ) {
          return x
        }

        return
      })

      if ( !found ) {
        return
      }

      const match = inputsMap.inputCodes.find(code => code.inputCode && inputCodes.includes(code.inputCode))
      let inputCode = ''
      if ( match ) {
        found = match
        inputCode = found.inputCode
      }

      all[playerIndex].push({ name, inputCode: inputCode })
    })
  })

  return all
}

function mapPortElm(element: Element) {
  const details = elmAttributesToObject(element) as PortDetails
  
  return {
    element, details,
  }
}

function registerPorts(
  port: Port,
  labels: UniqueInputLabel[],
  inputCodes: UniqueInputCode[],
) {
  let labelIndex = labels.findIndex(x => x.label === port.details.label)
  if ( labelIndex < 0 ) {
    labels.push({ label: port.details.label, inputCodes: [] })
    labelIndex = labels.length - 1
  }
  
  if ( !labels[labelIndex].inputCodes.includes(port.details.inputCodes) ) {
    labels[labelIndex].inputCodes.push(port.details.inputCodes)
  }
  
  let codeIndex = inputCodes.findIndex(x => x.inputCode === port.details.inputCodes)
  if ( codeIndex < 0 ) {
    inputCodes.push({ inputCode: port.details.inputCodes, labels: [] })
    codeIndex = inputCodes.length - 1
  }
  
  if ( !inputCodes[codeIndex].labels.includes(port.details.label) ) {
    inputCodes[codeIndex].labels.push(port.details.label)
  }
}