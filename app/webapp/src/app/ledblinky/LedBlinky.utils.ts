import { DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, firstValueFrom, from, map, mergeMap, Observable, of, shareReplay, Subject } from "rxjs"
import { hexToRgb } from "../inputs/platform.component"
import { AvailControlsMap } from "./LedBlinky.class"

/** 
 * Example: "P3START=189,117,65280,17" is "name=x,y,colorDec,diameter"
 */
export async function getLightConfigByLayoutFile(
  file: DmFileReader
): Promise<LightsConfig> {
  const layoutFileText = await file.readAsText()
  const ini = iniToObject(layoutFileText)
  const settings = ini['Settings'] as LightsLayoutConfig
  const layout = ini['Layout']

  const lights = Object.entries(layout).reduce((all, now) => {
    const details = now[1].replace(/(^,|,$)/g,'').split(',')
    const colorDec = Number(details[2])
    const details$ = of({
      name: now[0],
      x: Number(details[0]),
      y: Number(details[1]),
      colorDec,
      diameter: Number(details[3]),
    }).pipe( shareReplay(1) )

    const result: Light = {
      // colorHex: decodedColor,
      cssColor$: new BehaviorSubject( intToHex(colorDec) ),
      details$,
    }
    
    all.push(result)
    
    return all
  }, [] as Light[])

  // settings.ledLabelFontSize = Number(settings['LEDLabelFontSize'])

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
  diameter: number
}

export interface Light {
  details$: Observable<LightDetails>
  
  // computed
  cssColor$: BehaviorSubject<string>
  // colorHex$: Observable<string>

  startDragX?: number
  startDragY?: number
}

interface LightsLayoutConfig {
  LEDLabelFontSize: string
  // ledLabelFontSize: number
  
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
  lights: Light[]
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
  name: string // example: "CONTROL_TRACKBALL"
  voice: string // example: "Trackball"
  color: string
  
  inputCodes?: string
  allowConfigPlayerNum?: string | null // "0" | "1" | "2" ... "8"
  
  [index: string]: string | null | undefined
}

/*interface Control {
  element: Element
  details: ControlDetails
  inputCodes: string[]
}*/

export interface PlayerControl {
  element: Element
  
  details$: Observable<PlayerControlDetails>
  inputCodes$: Observable<string[]>
  
  edit?: boolean
  edited?: boolean

  // computed data points
  layoutLabel$: Observable<string | undefined> // runtime conversion of player.controls[n].inputCodes into LEDBlinkyInputMap.xml ledControllers[x].ports[x].label
  cssColor$: Observable<string>

  updateToCssColor$: BehaviorSubject<string>
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

  show?: boolean
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

export function getElementsByTagName(
  elm: Element | Document,
  tagName: string
): Element[] {
  return new Array( ...elm.getElementsByTagName(tagName) as any )
}

interface ControlDefaultDetails {
  groupName: string
  [index: string]: string | null
}

export interface ControlDefault {
  element: Element
  details: ControlDefaultDetails,
  controls: PlayerControl[] // Control[]
}

export interface LedBlinkyControls {
  inputsMap: InputsMap
  xml: Document
  controlDefaults: ControlDefault[]
  emulators: Emulator[]
  availMap?: AvailControlsMap
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
  labels: UniqueInputLabel[] // SPINNER, JOYSTICK1, P1B1
  inputCodes: UniqueInputCode[]
  ledControllers: LedController[]
}

export interface PortDetails {
  label: string
  inputCodes: string
  number: string
  type: string
  [index: string]: string | null
}

export interface Port {
  element: Element
  details: PortDetails
}

export interface LedControllerDetails {
  name: string
  id: string
  type: string
  [index: string] : string | null
}

export interface LedController {
  details: LedControllerDetails
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

function ledNumberedColorToCss(
  colorNums: string,
  curve = .6
) {
  const colorPos = colorNums.split(',').map(x => Number(x)) as [number, number, number]
  /* const colorPos = [48, 48, 48]  
  const colorRange = 12 // LEDBlinky has a 48 scale, lets divide it to make things little brighter
  const percents = [
    Math.ceil((colorPos[0] / colorRange) * 100),
    Math.ceil((colorPos[1] / colorRange) * 100),
    Math.ceil((colorPos[2] / colorRange) * 100),
  ]
  const end =  `rgba(${percents[0]}%, ${percents[1]}%, ${percents[2]}%, 1)`
  */

  const end = '#' + colorPos.map(num => {
    const percent = num/48
    const add = curve * (num /48)
    const endPercent = percent + add
    const endNum = endPercent * 255
    return Math.floor(endNum > 255 ? 255 : endNum).toString(16)
  }).map(x => x.length === 1 ? '0'+x : x).join('')
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
    const players = playerElements.map(element =>
      mapPlayerElement(element, {inputsMap, controlDefault, colorRgbConfig})
    )

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

/** reads xml looking for controlDefaults elements
 * Example: <controlDefaults groupName="MAME" description="...">
*/
export function getControlDefaultsByControlXml(
  xml: Document,
  colorRgbConfig?: IniNameValuePairs
): ControlDefault[] {
  return getElementsByTagName(xml,'controlDefaults').map(controlDefault => {
    const controls: PlayerControl[] = getElementsByTagName(controlDefault, 'control').map(element =>
      getControlByElement(element, colorRgbConfig)
    )
    
    const result: ControlDefault = {
      element: controlDefault,
      details: elmAttributesToObject(controlDefault) as ControlDefaultDetails,
      controls
    }
    return result
  })
}

export function mapPlayerElement(
  element: Element,
  {controlDefault, inputsMap, colorRgbConfig}: {
    controlDefault?: ControlDefault
    inputsMap?: InputsMap
    colorRgbConfig?: IniNameValuePairs
  }
) {
  const controls: PlayerControl[] = getElementsByTagName(element, 'control').map((element: Element) => {
    const control = getControlByElement(element, colorRgbConfig)

    // find if we have a control default to add additional inputCodes
    if ( controlDefault ) {
      control.inputCodes$ = combineLatest([
        control.inputCodes$,
        control.details$,
      ]).pipe(
        mergeMap(([codes, controlDetails]) => {
          return from(new Promise<string[]>(async (res, rej) => {
            
            const promises = controlDefault.controls.map(async defaultControl => {
              const defaultDetails = await firstValueFrom(defaultControl.details$)
              const matchFound = defaultDetails.name === controlDetails.name
              if ( !matchFound ) {
                return
              }
              const defaultInputCodes = await firstValueFrom(defaultControl.inputCodes$)
              return [ ...codes, ...defaultInputCodes ]
            }) 
            
            const result = (await Promise.all(promises)).find(x => x)
            
            res(result ?? codes)
          }))
        })
      )
    }
  
    // Do we have inputCode to match && did LEDBlinkyInputMap.xml exist
    control.layoutLabel$ = control.inputCodes$.pipe(
      map(inputCodes => {
        if ( !inputCodes.length || !inputsMap ) {
          return
        }
        
        const matchIndex = inputsMap.inputCodes.findIndex(mapDetails => mapDetails.inputCode && inputCodes.includes(mapDetails.inputCode))        
        if ( matchIndex < 0 ) {
          return
        }

        const code = inputsMap.inputCodes[ matchIndex ]
        return code.labels[0]
      })
    )

    return control
  })


  return {
    element,
    details: elmAttributesToObject(element) as PlayerDetails,
    controls
  }
}

export function getLastLayoutFileByLightsConfig(
  configObject: IniNameValuePairs
) {
  const name = configObject['LastLayoutFile']
  return getFileNameByPath(name)
}

export function castControlDetailsToCssColor(
  details: PlayerControlDetails,
  colorRgbConfig?: IniNameValuePairs,
) {
  const isNumbered = details.color.includes(',')
  const cssColor = isNumbered ? ledNumberedColorToCss(details.color) : ledColorNameToCss(details.color, colorRgbConfig)
  return cssColor
}

export function getControlByElement(
  element: Element,
  colorRgbConfig?: IniNameValuePairs,
  details?: PlayerControlDetails
): PlayerControl {
  const updateToCssColor$ = new BehaviorSubject<string>('')

  const details$ = combineLatest([
    new Observable<PlayerControlDetails>(subs => 
      subs.next(details || elmAttributesToObject(element) as PlayerControlDetails)
    ),
    updateToCssColor$,
  ])
  .pipe(
    map(([details, cssColor]) => {
      if ( cssColor ) {
        const noHashValue = cssColor.replace('#','')
        // details.color = parseInt(noHashValue, 16).toString()
        // details.color = '48,48,48'
        details.color = hexToRgb(noHashValue).map(x => 48 * (Math.floor((x/255)*100) / 100)).join(',')
      }    

      return details
    }),
    shareReplay(1)
  )
    
  const cssColor$ = details$.pipe(
    map(details => castControlDetailsToCssColor(details, colorRgbConfig))
  )

  const inputCodes$ = details$.pipe(
    map(details => details.inputCodes?.replace(/(^\||\|$)/g,'').split('|') || [])
  )
  
  const control: PlayerControl = {
    element,
    details$,
    inputCodes$,
    cssColor$,
    updateToCssColor$,
    layoutLabel$: of(''),
  }
  
  return control
}
