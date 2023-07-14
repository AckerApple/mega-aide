import { DmFileReader } from "ack-angular-components/directory-managers/DmFileReader"
import { BehaviorSubject, combineLatest, firstValueFrom, from, map, mergeMap, Observable, of, shareReplay } from "rxjs"
import { hexToRgb } from "../inputs/platform.component"
import { AvailControlsMap } from "./LedBlinky.class"
import { LightAndControl } from "./ledblinky-layouts.component"

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

    const colorDec$ = new BehaviorSubject( colorDec )
    const result: Light = {
      colorDec$,
      cssColor$: colorDec$.pipe(
        map(colorDec => intToHex(colorDec))
      ),
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
  // cssColor$: BehaviorSubject<string>
  colorDec$: BehaviorSubject<number>
  cssColor$: Observable<string>
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

export interface LightsControlConfig extends LightsConfig {
  settings: LightsLayoutConfig // was "layout"
  lightControls: LightAndControl[]
  file: DmFileReader
}

export interface LightsConfig {
  settings: LightsLayoutConfig // was "layout"
  lights: Light[]
  file: DmFileReader
}

/** color decimal to css */
export function intToHex(colorNumber: number): string {
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
  
  delete: () => void
  detailsChanged$: BehaviorSubject<PlayerControlDetails | undefined>
}

export interface NewControlGroup {
  details: ControlGroupDetails
  element?: Element
  players: NewPlayer[]
  
  defaultActiveCss$: Observable<string>
  defaultInactiveCss$: Observable<string>
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
  controlGroups: ControlGroupings[]// ControlGroupings[] // ControlGroupings[]
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
  file: DmFileReader
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
  colorRgbConfig?: IniNameValuePairs,
  curve?: number
) {
  const colorNums = colorRgbConfig && colorRgbConfig[name]
  if ( colorNums ) {
    const css = ledNumberedColorToCss(colorNums, curve)
    return css
  }

  return name
}

function ledNumberedColorToCss(
  colorNums: string,
  curve = .6
) {
  const colorPos = colorNums.split(',').map(x => Number(x)) as [number, number, number]
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
  curve$?: Observable<number>,
): Emulator {
  const emuDetails = elmAttributesToObject(element) as EmulatorDetails
  const controlGroups: Element[] = getElementsByTagName(element, 'controlGroup')

  // see if LEDBlinky controls has a default listing for an entire emulator
  const controlDefault = getEmulatorControlDefaults(emuDetails, controlDefaults)
  
  // loop the ROMS
  const mapped: ControlGroup[] = controlGroups.map(controlGroup => {
    const playerElements: Element[] = getElementsByTagName(controlGroup, 'player')
    const romDetails = elmAttributesToObject(controlGroup) as ControlGroupDetails
    const config =  {inputsMap, controlDefault, colorRgbConfig}
    const players = playerElements.map(element =>
      mapPlayerElement(
        element, config, curve$
      )
    )

    // sort by player number
    players.sort((a,b)=>String(a.details.number||'').toLowerCase()>String(b.details.number||'').toLowerCase()?1:-1)

    curve$ = curve$ || new BehaviorSubject(0)

    // load players (LEDBlinkyControls.xml <controlGroup> <player number> <control read-the-attrs>)
    const group: ControlGroup = {
      // TODO, read LEDBlinkyMinimizedMame.xml and attempt to convert rom name into mame title (maybe just read mame directly? Maybe too intense of a file?)
      element: controlGroup,
      details: romDetails,
      players,
      ...getRomObservables(romDetails, curve$, colorRgbConfig)
    }

    return group
  })

  const groupObject = mapped.reduce((all, now) => {
    const groupName = now.details['groupName'] as string
    all[ groupName ] = all[ groupName ] || []
    all[ groupName ].push(now)
    return all
  }, {} as Record<string, ControlGroup[]>) 

  const controlGroupsMap: ControlGroupings[] = Object.entries(groupObject).map(([groupName, controlGroups]) => ({
    groupName,
    controlGroups,
    voice: controlGroups[0]?.details.voice
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
  curve$?: Observable<number> // curve?: number
): Emulator[] {
  const emulators = getElementsByTagName(xml, 'emulator')
  const mappedEmulators = emulators.map(emulator => {
    return mapEmulatorElement(
      emulator, inputsMap, controlDefaults, colorRgbConfig, curve$
    )
  })

  mappedEmulators.sort((a,b)=>String(a.details.emuname||'').toLowerCase()>String(b.details.emuname||'').toLowerCase()?1:-1)

  return mappedEmulators
}

/** reads xml looking for controlDefaults elements
 * Example: <controlDefaults groupName="MAME" description="...">
*/
export function getControlDefaultsByControlXml(
  xml: Document,
  inputsMap: InputsMap,
  colorRgbConfig?: IniNameValuePairs,
  curve$?: Observable<number>,
): ControlDefault[] {
  return getElementsByTagName(xml,'controlDefaults').map(controlDefault => {
    const controlElements = getElementsByTagName(controlDefault, 'control')
    const controls: PlayerControl[] = []
    
    controls.push(
      ...controlElements.map(element =>
        getControlByElement(element, {colorRgbConfig, curve$, controls, inputsMap})
      )
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
  },
  curve$?: Observable<number>
) {
  const controls: PlayerControl[] = []
  
  const results = getElementsByTagName(element, 'control').map((element: Element) => {
  const control = getControlByElement(element, {colorRgbConfig, curve$, controls, inputsMap})

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
                return null
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
      map(inputCodes => getLabelByInputCodes(inputsMap, inputCodes))
    )

    return control
  })

  controls.push(...results)


  return {
    element,
    details: elmAttributesToObject(element) as PlayerDetails,
    controls
  }
}

/** Typically used to figure out which layout button belongs to which game mapping */
function getLabelByInputCodes(
  inputsMap: InputsMap | undefined,
  inputCodes: string[]
): string | undefined {
  if (!inputCodes.length || !inputsMap) {
    return
  }

  const matchIndex = inputsMap.inputCodes.findIndex(mapDetails => mapDetails.inputCode && inputCodes.includes(mapDetails.inputCode))
  if (matchIndex < 0) {
    return
  }

  const code = inputsMap.inputCodes[matchIndex]
  return code.labels[0]
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
  curve?: number,
) {
  return castColorDetailsToCssColor(details.color, colorRgbConfig, curve)
}

export function castColorDetailsToCssColor(
  color: string,
  colorRgbConfig?: IniNameValuePairs,
  curve?: number,
) {
  const isNumbered = color.includes(',')
  if ( isNumbered ) {
    return ledNumberedColorToCss(color, curve)
  }

  return ledColorNameToCss(color, colorRgbConfig, curve)
}

export function getControlByElement(
  element: Element,
  {inputsMap, colorRgbConfig, details, curve$, controls}: {
    inputsMap?: InputsMap,
    colorRgbConfig?: IniNameValuePairs,
    details?: PlayerControlDetails,
    curve$?: Observable<number>,
    controls: PlayerControl[],
  },
): PlayerControl {
  const updateToCssColor$ = new BehaviorSubject<string>('')

  const detailsChanged$ = new BehaviorSubject(details)
  const details$ = combineLatest([
    new Observable<PlayerControlDetails>(subs => {
      subs.next(details || elmAttributesToObject(element) as PlayerControlDetails)
      subs.complete()
    }),
    updateToCssColor$,
    detailsChanged$,
  ])
  .pipe(
    map(([details, cssColor]) => {
      if ( cssColor ) {
        const noHashValue = cssColor.replace('#','')
        details.color = hexToRgb(noHashValue).map(rgbNum).join(',')
      }    

      //console.log('((((details))))', details)
      return details
    }),
    shareReplay(1) // ensure changes made to details are shared
  )
    
  curve$ = curve$ || new BehaviorSubject(.6)
  const cssColor$ = combineLatest([details$, curve$]).pipe(
    map(([details, curve]) => castControlDetailsToCssColor(
      details, colorRgbConfig, curve
    ))
  )

  const inputCodes$ = details$.pipe(
    map(details => details.inputCodes?.replace(/(^\||\|$)/g,'').split('|') || []),
    shareReplay(1),
  )
  
  const control: PlayerControl = {
    element,
    details$,
    inputCodes$,
    cssColor$,
    updateToCssColor$,
    detailsChanged$,
    delete: () => {
      const deleteIndex = controls.findIndex(iCon => iCon === control)
      controls.splice(deleteIndex,1)
    },
    layoutLabel$: inputCodes$.pipe(
      map(inputCodes => {
        return getLabelByInputCodes(inputsMap, inputCodes)
      })
    ),
  }
  
  return control
}

function rgbNum(x: number) {
  return Math.floor(48 * (Math.floor((x/255)*100) / 100))
}


export function getRomObservables(
  romDetails: ControlGroupDetails,
  curve$: Observable<number>,
  colorRgbConfig?: IniNameValuePairs,
) {
  return  {
    defaultActiveCss$: curve$.pipe(
      map(curve => {
        if ( !romDetails.defaultActive ) {
          return ''
        }

        const isNumbered = romDetails.defaultActive.includes(',')
        if ( isNumbered ) {
          return ledNumberedColorToCss(romDetails.defaultActive, curve)
        }
        
        return ledColorNameToCss(romDetails.defaultActive, colorRgbConfig)
      })
    ),

    defaultInactiveCss$: curve$.pipe(
      map(curve => {
        if ( !romDetails.defaultInactive ) {
          return ''
        }

        const color = romDetails.defaultInactive
        const isNumbered = romDetails.defaultInactive.includes(',')
        const cssColor = isNumbered ? ledNumberedColorToCss(romDetails.defaultInactive, curve) : ledColorNameToCss(color, colorRgbConfig)
        return cssColor
      })
    ),
  }
}
