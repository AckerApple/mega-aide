import { EventEmitter } from "@angular/core"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { SessionProvider } from "../session.provider"
import { elmAttributesToObject, Emulator, getControlDefaultsByControlXml, getElementsByTagName, getEmulatorsByControl, getFileNameByPath, getLightConfigByLayoutFile, IniNameValuePairs, iniToObject, InputMap, InputsMap, LedBlinkyControls, LightsConfig, NewControlGroupings, NewEmulator, Port, PortDetails, UniqueInputCode, UniqueInputLabel } from "./LedBlinky.utils"

enum LEDBlinkyFiles {
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
  directory?: DirectoryManager
  directoryChange = new EventEmitter<DirectoryManager>()
  
  displaySize?: Size
  emulator?: Emulator | NewEmulator
  pickerId = 'ledBlinkyPicker'
  colors?: IniNameValuePairs
  controls?: LedBlinkyControls // TODO: memory intensive to leave this hanging around

  // custom to this app
  zoom: number = 1.5

  constructor(public session: SessionProvider) {}

  setDir(directory: DirectoryManager) {
    this.directoryChange.emit( this.directory = directory )
    this.loadColorRgbConfig() // load the most basic config all files need
  }

  /** this function will be mutated at runtime */
  async getNewInputCodes() {
    return this.loadNewInputCodes()
  }

  async loadNewInputCodes(): Promise<IniNameValuePairs | undefined> {
    if ( !this.directory ) {
      return
    }

    const iniFileName = LEDBlinkyFiles.NewInputCodes
    const fxEditorConfig = await this.directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${this.directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)['InputCodes']
    // this.newCodes = configObject
    // this.getNewInputCodes = async () => this.colors
    return configObject
  }

  /** this function will be mutated at runtime */
  async getColorRgbConfig(): Promise<IniNameValuePairs | undefined> {
    return this.loadColorRgbConfig()
  }

  async loadColorRgbConfig() {
    if ( !this.directory ) {
      return
    }

    const iniFileName = LEDBlinkyFiles.Color_RGB
    const fxEditorConfig = await this.directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${this.directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)['Colors']
    this.colors = configObject
    this.getColorRgbConfig = async () => this.colors
    return this.colors
  }
  
  /** this function will be mutated at runtime */
  async getConfigWizard(): Promise<ConfigWiz | undefined> {
    return this.loadConfigWizard()
  }

  configWiz?: ConfigWiz
  async loadConfigWizard(): Promise<ConfigWiz | undefined> {
    if ( !this.directory ) {
      return
    }

    const iniFileName = LEDBlinkyFiles.LEDBlinkyConfigWizard
    const fxEditorConfig = await this.directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${this.directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)
    
    this.configWiz = configObject
    this.getConfigWizard = async () => Promise.resolve(this.configWiz)

    return this.configWiz
  }

  async loadAnimEditorObject() {
    if ( !this.directory ) {
      return
    }

    const iniFileName = LEDBlinkyFiles.LEDBlinkyAnimationEditor
    const fxEditorConfig = await this.directory.findFileByPath(iniFileName)
    
    if ( !fxEditorConfig ) {
      this.session.warn(`Cannot load ${this.directory.path} ${iniFileName}`)
      return
    }

    const config = await fxEditorConfig.readAsText()
    const configObject = iniToObject(config)['Settings']
    this.displaySize = displaySizes[ Number(configObject['DisplaySize']) - 1 ]
    return configObject
  }

  async loadFxEditorByDir(): Promise<LightsConfig | undefined> {
    const configObject = await this.loadAnimEditorObject()
    
    if ( !configObject ) {
      return
    }

    // get relative file path to layout file
    const relativeFile = getFileNameByPath(configObject['LastLayoutFile'])
    return this.loadLightLayoutByName(relativeFile)
  }

  async loadLightLayoutByName(relativeFile?: string) {
    const directory = this.directory
    if ( !directory || !relativeFile ) {
      return
    }
    const layoutFile = await directory.findFileByPath(relativeFile)

    if ( !layoutFile ) {
      this.session.warn(`Cannot load ${directory.path} ${relativeFile}`)
      return
    }
    
    const layoutConfig = await getLightConfigByLayoutFile(layoutFile)
    this.session.debug('🗺 ⚙️ Loaded layoutConfig', layoutConfig)
    return layoutConfig
  }

  /** this function mutated by loadControls */
  getControls() {
    return this.loadControls()
  }

  async loadControls(): Promise<LedBlinkyControls | undefined> {
    if ( !this.directory ) {
      return
    }
    
    const file = await this.directory.findFileByPath(LEDBlinkyFiles.LEDBlinkyControls)
    
    if ( !file ) {
      this.session.warn(`cannot find file ${this.directory.path} ${LEDBlinkyFiles.LEDBlinkyControls}`)
      return
    }
    
    const [inputsMap, xml] = await Promise.all([
      this.loadInputMap(), file.readAsXml()
    ])
    
    if ( !inputsMap ) {
      return // a log warning was already fired
    }

    const controlDefaults = getControlDefaultsByControlXml(xml)
    const colors = await this.getColorRgbConfig()

    this.controls = {
      inputsMap, xml,
      emulators: getEmulatorsByControl(xml, inputsMap, controlDefaults, colors),
      controlDefaults
    }

    // mutate function to always return loaded results
    this.getControls = () => Promise.resolve(this.controls)

    return this.controls
  }

  async getInputMap(): Promise<InputsMap | undefined> {
    return this.loadInputMap()
  }

  async loadInputMap(): Promise<InputsMap | undefined> {
    if ( !this.directory ) {
      return
    }
    
    const file = await this.directory.findFileByPath( LEDBlinkyFiles.LEDBlinkyInputMap )

    if ( !file ) {
      this.session.warn(`cannot find file ${this.directory.path} ${LEDBlinkyFiles.LEDBlinkyInputMap}`)
      return
    }
    
    const labels: UniqueInputLabel[] = []
    const inputCodes: UniqueInputCode[] = []

    const xml = await file.readAsXml()
    const inputs: InputMap[] = getElementsByTagName(xml, 'ledController').map(element => {
      const ports: Port[] = getElementsByTagName(element, 'port').map(element => {
        const details = elmAttributesToObject(element) as PortDetails
        
        let labelIndex = labels.findIndex(x => x.label === details.label)
        if ( labelIndex < 0 ) {
          labels.push({ label: details.label, inputCodes: [] })
          labelIndex = labels.length - 1
        }
        
        if ( !labels[labelIndex].inputCodes.includes(details.inputCodes) ) {
          labels[labelIndex].inputCodes.push(details.inputCodes)
        }
        
        let codeIndex = inputCodes.findIndex(x => x.inputCode === details.inputCodes)
        if ( codeIndex < 0 ) {
          inputCodes.push({ inputCode: details.inputCodes, labels: [] })
          codeIndex = inputCodes.length - 1
        }
        
        if ( !inputCodes[codeIndex].labels.includes(details.label) ) {
          inputCodes[codeIndex].labels.push(details.label)
        }

        return {
          element, details,
        }
      })
      return { element, ports }
    })

    const result: InputsMap = {
      labels, inputCodes, inputs
    }

    this.getInputMap = () => Promise.resolve(result)

    return result
  }

  async getUnknownGames(): Promise<NewEmulator[] | undefined> {
    if ( !this.directory ) {
      return
    }

    const dat = await this.directory.findFileByPath('UnknownGames.dat')
    if ( !dat ) {
      return
    }

    const text = await dat.readAsText()
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
