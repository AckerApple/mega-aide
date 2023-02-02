import { DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"

export async function getLightConfigByLayoutFile(
  file: DmFileReader
): Promise<LightsConfig> {
  const layoutFileText = await file.readAsText()
  const ini = iniToObject(layoutFileText)
  const settings = ini['Settings'] as LightsLayoutConfig
  const layout = ini['Layout']

  const lights = Object.entries(layout).reduce((all, now) => {
    const details = now[1].replace(/(^,|,$)/g,'').split(',')
    const decodedColor = intToHex(Number(details[2]))
    const result: LightDetails = {
      name: now[0],
      x: Number(details[0]),
      y: Number(details[1]),
      colorDec: Number(details[2]),
      colorHex: decodedColor,
      cssColor: decodedColor,
      diameter: Number(details[3]),
    }
    all.push(result)
    return all
  }, [] as LightDetails[])

  settings.ledLabelFontSize = Number(settings['LEDLabelFontSize'])

  return { settings, lights, file }
}

export interface IniNameValuePairs {
  [name: string]: string
}

export function iniToObject(
  config: string
): { [name: string]: IniNameValuePairs } {
  const configObject = {} as { [name: string]: {[name: string]: string} }
  
  let currentSetName = ''
  // split lines of ini file
  const nameValuesString = config.split(/\n|\r/).forEach(x => {
    if ( x.charAt(0) === ';' ) {
      return // its a comment line
    }

    if ( x.search(/^\[.+\]$/) >=0 ) {
      currentSetName = x.replace(/(^\[|\]$)/g, '')
      configObject[currentSetName] = {}
      return
    }

    if ( !x.includes('=') ) {
      return // do not continue
    }

    const split = x.split('=')
    const key = split.shift() as string
    
    configObject[currentSetName][ key.trim() ] = split.join('=').trim()
  })
  
  return configObject
}

export interface LightDetails {
  name: string // ie: "P1START" or "P1COIN" or "P1B1"
  x: number
  y: number
  colorDec: number
  colorHex: string
  cssColor: string
  diameter: number
}

interface LightsLayoutConfig {
  LEDLabelFontSize: string
  ledLabelFontSize: number
  
  CPBackColor: string // "12632256"
  DefaultOnBehavior: string
  DefaultOnColor: string
  InputMapFile: string // "C:\\Users\\Administrator\\LaunchBox\\Tools\\LEDBlinky\\LEDBlinkyInputMap.xml"
  LEDBorderColor: string
  LEDLabelColor: string
  [name: string]: string | number
}

export interface LightsConfig {
  settings: LightsLayoutConfig // was "layout"
  lights: LightDetails[]
  file: DmFileReader
}

function intToHex(colorNumber: number): string {
  function toHex(n: any) {
    n = n.toString(16) + '';
    return n.length >= 2 ? n : new Array(2 - n.length + 1).join('0') + n;
  }

  var r = toHex(Math.floor( Math.floor(colorNumber / 256) / 256 ) % 256),
      g = toHex(Math.floor( colorNumber / 256 ) % 256),
      b = toHex(colorNumber % 256);
  return '#' + r + g + b; 
}

export function getFileNameByPath(path: string) {
  return path.replace(/\\/g,'/').replace(/(.+LEDBlinky\/)/g,'')
}

export interface PlayerDetails {
  number: string
  [index: string]: string | null
}

/* <controlGroup> */
export interface ControlGroupDetails {
  groupName: string
  voice?: string
  
  defaultActive?: string | null
  defaultInactive?: string | null
  numPlayers?: string // ="1"
  alternating?: string // ="0"
  jukebox?: string // ="0"
  ledwizGlobalPulse?: string // ="3"
  
  [index: string]: string | null | undefined
}

export interface PlayerControlDetails {
  name: string
  voice: string
  color: string
  inputCodes: string
  [index: string]: string | null
}

export interface PlayerControl {
  details: PlayerControlDetails
  element: Element
  
  edit?: boolean
  edited?: boolean

  // computed data points
  layoutLabel?: string // runtime conversion of player.controls[n].inputCodes into LEDBlinkyInputMap.xml ledControllers[x].ports[x].label
  inputCodes: string[]
  cssColor: string
}

export interface NewControlGroup {
  details: ControlGroupDetails
  element?: Element
  players: NewPlayer[]
  
  defaultActiveCss?: string
  defaultInactiveCss?: string
}

export interface NewPlayer {
  details: PlayerDetails
  element?: Element
  controls: PlayerControl[]
}

export interface Player extends NewPlayer {
  element: Element
}

export interface ControlGroup extends NewControlGroup {
  element: Element
  players: Player[]
}

export interface NewControlGroupings {
  groupName: string
  voice?: string
  controlGroups: NewControlGroup[]
}
export interface ControlGroupings extends NewControlGroupings {
  controlGroups: ControlGroup[]
}

export function elmAttributesToObject(element: Element) {
  return element.getAttributeNames()
    .reduce((all, name) => {
      all[name] = element.getAttribute(name)
      return all
    }, {} as Record<string, string | null>)
}

export interface EmulatorDetails {
  emuname: string
  emuDesc?: string
  [index: string]: string | null | undefined
}

export interface NewEmulator {
  details: EmulatorDetails
  controlGroups: NewControlGroupings[] // ControlGroupings
  element?: Element
  viewJson?: boolean
  viewXml?: boolean
}

export interface Emulator extends NewEmulator {
  element: Element
}

export function getElementsByTagName(elm: Element | Document, tagName: string): Element[] {
  return new Array( ...elm.getElementsByTagName(tagName) as any )
}

interface ControlDetails {
  name: string // example: "CONTROL_TRACKBALL"
  voice: string // example: "Trackball"
  inputCodes?: string // example: "TRACKBALL"
  allowConfigPlayerNum: string // example: "0"
  [index: string]: string | null | undefined
}

interface Control {
  element: Element
  details: ControlDetails
  inputCodes: string[]
}

interface ControlDefaultDetails {
  groupName: string
  [index: string]: string | null
}

export interface ControlDefault {
  element: Element
  details: ControlDefaultDetails,
  controls: Control[]
}

export interface LedBlinkyControls {
  inputsMap: InputsMap
  xml: Document
  controlDefaults: ControlDefault[]
  emulators: Emulator[]
}

export interface UniqueInputLabel {
  label: string
  inputCodes: string[]
}

export interface UniqueInputCode {
  inputCode: string // ['KEYCODE_3']
  labels: string[]  // ex: ['P3START']
}

export interface InputsMap {
  labels: UniqueInputLabel[]
  inputCodes: UniqueInputCode[]
  inputs: InputMap[]
}

export interface PortDetails {
  label: string
  inputCodes: string
  [index: string]: string | null
}

export interface Port {
  element: Element
  details: PortDetails
}

export interface InputMap {
  element: Element
  ports: Port[]
}

function ledColorNameToCss(
  name: string,
  colorRgbConfig?: IniNameValuePairs
) {
  const colorNums = colorRgbConfig && colorRgbConfig[name]
  if ( colorNums ) {
    const css = ledNumberedColorToCss(colorNums)
    return css
  }

  return name
}

function ledNumberedColorToCss(colorNums: string) {
  const colorRange = 12 // LEDBlinky has a 48 scale, lets half to make things little brighter
  const colorPos = colorNums.split(',').map(x => Number(x)) as [number, number, number]
  const percents = [
    Math.ceil((colorPos[0]/colorRange) * 100),
    Math.ceil((colorPos[1]/colorRange) * 100),
    Math.ceil((colorPos[2]/colorRange) * 100),
  ]
  const end =  `rgba(${percents[0]}%, ${percents[1]}%, ${percents[2]}%, 1)`
  return end
}

function mapEmulatorElement(
  element: Element,
  inputsMap: InputsMap,
  controlDefaults: ControlDefault[],
  colorRgbConfig?: IniNameValuePairs,
): Emulator {
  const emuDetails = elmAttributesToObject(element) as EmulatorDetails
  const controlGroups: Element[] = getElementsByTagName(element, 'controlGroup')

  // see if LEDBlinky controls has a default listing for an entire emulator
  const controlDefault = getEmulatorControlDefaults(emuDetails, controlDefaults)
  
  // loop the ROMS
  const mapped: ControlGroup[] = controlGroups.map(controlGroup => {
    const playerElements: Element[] = getElementsByTagName(controlGroup, 'player')
    const romDetails = elmAttributesToObject(controlGroup) as ControlGroupDetails
    const players = playerElements.map(element => mapPlayerElement(element, {inputsMap, controlDefault, colorRgbConfig}))

    // sort by player number
    players.sort((a,b)=>String(a.details.number||'').toLowerCase()>String(b.details.number||'').toLowerCase()?1:-1)
    
    // load players (LEDBlinkyControls.xml <controlGroup> <player number> <control read-the-attrs>)
    const group: ControlGroup = {
      // TODO, read LEDBlinkyMinimizedMame.xml and attempt to convert rom name into mame title (maybe just read mame directly? Maybe too intense of a file?)
      element: controlGroup,
      details: romDetails,
      players,
    }

    if ( group.details.defaultActive ) {
      const color = group.details.defaultActive
      const isNumbered = color.includes(',')
      const cssColor = isNumbered ? ledNumberedColorToCss(color) : ledColorNameToCss(color, colorRgbConfig)
      group.defaultActiveCss = cssColor
    }
    if ( group.details.defaultInactive ) {
      const color = group.details.defaultInactive
      const isNumbered = color.includes(',')
      const cssColor = isNumbered ? ledNumberedColorToCss(color) : ledColorNameToCss(color, colorRgbConfig)
      group.defaultInactiveCss = cssColor
    }

    return group
  })

  const groupObject = mapped.reduce((all, now) => {
    const groupName = now.details['groupName'] as string
    all[ groupName ] = all[ groupName ] || []
    all[ groupName ].push(now)
    return all
  }, {} as Record<string, ControlGroup[]>) 

  const controlGroupsMap = Object.entries(groupObject).map(([groupName, controlGroups]) => ({
    groupName, controlGroups, voice: controlGroups[0]?.details.voice
  }))

  const result: Emulator = {
    element, details: emuDetails,
    controlGroups: controlGroupsMap,
  }
  
  return result
}

function getEmulatorControlDefaults(
  emulator: EmulatorDetails,
  controlDefaults: ControlDefault[],
): ControlDefault | undefined {
  const findGroupName = emulator.emuname
  return controlDefaults.find(x => x.details.groupName === findGroupName)
}

export function getEmulatorsByControl(
  xml: Document,
  inputsMap: InputsMap,
  controlDefaults: ControlDefault[],
  colorRgbConfig?: IniNameValuePairs,
): Emulator[] {
  const emulators = getElementsByTagName(xml, 'emulator')
  const mappedEmulators = emulators.map(emulator => {
    return mapEmulatorElement(emulator, inputsMap, controlDefaults, colorRgbConfig)
  })

  mappedEmulators.sort((a,b)=>String(a.details.emuname||'').toLowerCase()>String(b.details.emuname||'').toLowerCase()?1:-1)

  return mappedEmulators
}

export function getControlDefaultsByControlXml(xml: Document): ControlDefault[] {
  return getElementsByTagName(xml,'controlDefaults').map(controlDefault => {
    const controls: Control[] = getElementsByTagName(controlDefault, 'control').map(element => {
      const details = elmAttributesToObject(element) as ControlDetails
      const inputCodes = details.inputCodes?.replace(/(^\||\|$)/g,'').split('|') || []
      const control: Control = {
        element, details, inputCodes
      }
      return control
    })
    
    const result: ControlDefault = {
      element: controlDefault,
      details: elmAttributesToObject(controlDefault) as ControlDefaultDetails,
      controls
    }
    return result
  })
}

function mapPlayerElement(
  element: Element,
  {controlDefault, inputsMap, colorRgbConfig}: {
    controlDefault?: ControlDefault
    inputsMap?: InputsMap
    colorRgbConfig?: IniNameValuePairs
  }
) {
  const controls: PlayerControl[] = getElementsByTagName(element, 'control').map((element: Element) => {
    const details = elmAttributesToObject(element) as PlayerControlDetails
    const isNumbered = details.color.includes(',')
    const cssColor = isNumbered ? ledNumberedColorToCss(details.color) : ledColorNameToCss(details.color, colorRgbConfig)
    const inputCodes: string[] = details.inputCodes?.replace(/(^\||\|$)/g,'').split('|') || []
    const control: PlayerControl = {
      element, details, cssColor, inputCodes,
    }

    // find if we have a control default to add additional inputCodes
    if ( controlDefault ) {
      controlDefault.controls.forEach(defaults => {
        const matchFound = defaults.details.name === control.details.name
        if ( matchFound ) {
          inputCodes.push( ...defaults.inputCodes )
          return
        }
        
        //clone.inputCodes = matchFound
      })
    }
    
    // Do we have inputCode to match && did LEDBlinkyInputMap.xml exist
    if ( inputCodes.length && inputsMap ) {
      const matchIndex = inputsMap.inputCodes.findIndex(mapDetails => mapDetails.inputCode && inputCodes.includes(mapDetails.inputCode))
      
      if ( matchIndex >= 0 ) {
        const code = inputsMap.inputCodes[ matchIndex ]
        control.layoutLabel = code.labels[0]
      }
    }
    
    return control
  })

  return {
    element,
    details: elmAttributesToObject(element) as PlayerDetails,
    controls
  }
}