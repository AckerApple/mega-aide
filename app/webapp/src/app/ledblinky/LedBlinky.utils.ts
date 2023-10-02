import { DmFileReader } from "ack-angular-components/directory-managers/DmFileReader"
import { EMPTY, Observable, combineLatest, firstValueFrom, from, map, mergeMap, of, switchMap, take } from "rxjs"
import { LedBlinky } from "./LedBlinky.class"
import { ControlDefault, PlayerControl, PlayerControlDetails, matchControlToLight } from "./PlayerControl.class"
import { LightAndControl, LightControl } from "./LightAndControl.interface"
import { LedController } from "./LEDController.class"
import { NewPlayer, PlayerDetails } from "./Player.class"
import { Light, LightDetails } from "./Light.class"
import { ControlGroup, NewControlGroup } from "./ControlGroup.class"
import { Emulator, EmulatorDetails, getControlsByElement } from "./Emulator.class"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { Port } from "./LedPort.class"
import { ControlGroupings } from "./ControlGroupings"
import { Control } from "../platforms"
import { elmAttributesToObject, getElementsByTagName } from "./element.utils"

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
    const detailsArray = now[1].replace(/(^,|,$)/g,'').split(',')
    const colorDec = Number(detailsArray[2])
    const details: LightDetails = {
      name: now[0],
      x: Number(detailsArray[0]),
      y: Number(detailsArray[1]),
      colorDec,
      diameter: Number(detailsArray[3]),
    }

    const result: Light = new Light(details)
    
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
  lightControls: LightControl[]
  file: DmFileReader
}

export interface LightsAndControlConfig extends LightsControlConfig {
  lightControls: LightAndControl[]
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

interface ControlDefaultDetails {
  groupName: string
  [index: string]: string | null
}

// represents <controlDefaults>
export interface ControlDefaults {
  element: Element
  details: ControlDefaultDetails,
  controls: ControlDefault[] // <control>[]
}

export interface LedBlinkyControls {
  file: DmFileReader
  inputsMap: InputsMap
  xml: Document
  controlDefaults: ControlDefaults[]
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

// Goes with LEDBlinkyInputMap.xml
export interface InputsMap {
  labels: UniqueInputLabel[] // SPINNER, JOYSTICK1, P1B1
  inputCodes: UniqueInputCode[]
  ledControllers: LedController[]
  file: DmFileReader
  xml: Document
}

export interface PortDetails {
  label: string
  inputCodes: string
  number: string
  type: string
  [index: string]: string | null
}

export interface LedControllerDetails {
  name: string
  id: string
  type: string
  [index: string] : string | null
}

export function ledColorNameToCss(
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

export function ledNumberedColorToCss(
  colorNums: string,
  curve = .6
) {
  const colorPos = colorNums.split(',').map(x => Number(x)) as [number, number, number]

  if ( colorPos.length > 3 ) {
    colorPos.length = 3 // defaultActive is sometimes 48,48,48,48
  }
  
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
  controlDefaults: ControlDefaults[],
  ledBlinky: LedBlinky,
  // colorRgbConfig?: IniNameValuePairs,
): Emulator {
  const emuDetails = elmAttributesToObject(element) as EmulatorDetails

  // see if LEDBlinky controls has a default listing for an entire emulator
  const controlDefault = getEmulatorControlDefaults(emuDetails, controlDefaults)

  const emulator: Emulator = new Emulator(ledBlinky, emuDetails, element)
  const mapped: ControlGroup[] = emulator.loadControlGroups(controlDefault)

  const groupObject = mapped.reduce((all, now) => {
    const groupName = now.xml.details['groupName'] as string
    all[ groupName ] = all[ groupName ] || []
    all[ groupName ].push(now)
    return all
  }, {} as Record<string, ControlGroup[]>) 

  const controlGroupsMap: ControlGroupings[] = Object.entries(groupObject).map(([groupName, controlGroups]) => ({
    groupName,
    controlGroups,
    voice: controlGroups[0]?.xml.details.voice
  }))

  emulator.controlGroups.push(...controlGroupsMap)
  
  return emulator
}

function getEmulatorControlDefaults(
  emulator: EmulatorDetails,
  controlDefaults: ControlDefaults[],
): ControlDefaults | undefined {
  const findGroupName = emulator.emuname
  return controlDefaults.find(x => x.details.groupName === findGroupName)
}

export function getEmulatorsByControl(
  xml: Document,
  controlDefaults: ControlDefaults[],
  LedBlinky: LedBlinky,
): Emulator[] {
  const emulators = getElementsByTagName(xml, 'emulator')
  const mappedEmulators = emulators.map(emulator => {
    return mapEmulatorElement(
      emulator, controlDefaults, LedBlinky,
    )
  })

  mappedEmulators.sort((a,b)=>String(a.xml.details.emuname||'').toLowerCase()>String(b.xml.details.emuname||'').toLowerCase()?1:-1)

  return mappedEmulators
}

/** reads xml looking for controlDefaults elements
 * Example: <controlDefaults groupName="MAME" description="...">
*/
export function getControlDefaultsByControlXml(
  xml: Document,
  ledBlinky: LedBlinky,
): ControlDefaults[] {
  return getElementsByTagName(xml,'controlDefaults').map(controlDefault => {
    const emulatorDetails = elmAttributesToObject(controlDefault) as EmulatorDetails
    const emu = new Emulator(ledBlinky, emulatorDetails, controlDefault)
    
    const controlGroup = new ControlGroup(
      emu,
      [],
      ledBlinky
    )
    const controls = getControlsByElement(controlDefault, controlGroup, ledBlinky) as ControlDefault[]
    const details = elmAttributesToObject(controlDefault) as ControlDefaultDetails

    const result: ControlDefaults = {
      element: controlDefault, details, controls
    }
    return result
  })
}

export function mapPlayerElement(
  element: Element,
  { controlGroup, controlDefault, ledBlinky, player, playerIndex }: {
    controlDefault?: ControlDefaults
    ledBlinky: LedBlinky,
    player: NewPlayer,
    playerIndex: number,
    controlGroup: NewControlGroup,
  },
): NewPlayer {
  const controls: PlayerControl[] = []
  
  const results = getElementsByTagName(element, 'control').map((element: Element) => {
    const control = getControlByElement(element, {
      controls, ledblinky: ledBlinky, player
    }) as PlayerControl

    // find if we have a control default to add additional inputCodes
    // 7-27-23: not sure if this code has benefit
    if ( controlDefault ) {
      const oldFunc = control.getInputCodes
      control.getInputCodes = () => {         
        const codes = oldFunc.call(control)
        const mapCodes: string[][] = controlDefault.controls.map((defaultControl: ControlDefault) => {
          const defaultDetails = defaultControl.xml.details
          const matchFound = defaultDetails.name === control.xml.details.name
          if ( !matchFound ) {
            return []
          }

          const defaultInputCodes = defaultControl.getInputCodes()
          return [ ...codes, ...defaultInputCodes ]
        })
          
        const result = mapCodes.find(x => x)
        
        return result ?? codes
      }
    }
  
    // Do we have inputCode to match && did LEDBlinkyInputMap.xml exist
    control.layoutLabel$ = combineLatest([
      ledBlinky.inputsMap$,
    ]).pipe(
      map(([inputsMap]) => matchControlToLight(inputsMap, control))
    )

    return control
  })

  controls.push(...results)

  const details = elmAttributesToObject(element) as PlayerDetails
  player.playerIndex = playerIndex
  player.controlGroup = controlGroup
  player.xml.element = element
  player.xml.addDetails(details)
  player.controls = controls

  return player
}

/** Typically used to figure out which layout button belongs to which game mapping */
export function getLabelByInputCodes(
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
  if ( !details.color ) {
    return ''
  }
  
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
  {
    details, controls, ledblinky, player,
  }: {
    controls: (PlayerControl | ControlDefault)[],
    details?: PlayerControlDetails,
    ledblinky: LedBlinky,
    player?: NewPlayer
  },
): PlayerControl | ControlDefault {  
  details = details || elmAttributesToObject(element) as unknown as PlayerControlDetails
  const control = player ? new PlayerControl(ledblinky, controls as PlayerControl[], player) : new ControlDefault(ledblinky, controls as ControlDefault[])
  control.xml.element = element
  control.xml.addDetails(details)
  return control
}

export function rgbNum(x: number) {
  return Math.floor(48 * (Math.floor((x/255)*100) / 100))
}


export async function marryPlayerControlsToLights(
  player: NewPlayer,
  lightConfig: LightsConfig,
  ledBlinky: LedBlinky,
): Promise<LightAndControl[]> {  
  // loop all lights and remap the colors
  const proms = lightConfig.lights.map(
    mapLightToPlayer(player, ledBlinky)
  )
  const lightControls: LightAndControl[] = (
    await Promise.all(proms)
  ).filter(x => x) as LightAndControl[]
    
  return lightControls
}

function mapLightToPlayer(
  player: NewPlayer,
  ledBlinky: LedBlinky
): (value: Light, index: number, array: Light[]) => Promise<LightAndControl | undefined> {
  return async (light) => {
    let clone: Light = {...light} as any // new Light({...light.details})

    // light overrides
    clone.colorDec$.next(0) // ensure every light starts black


    // give different instructions on how to get color
    clone.cssColor$ = clone.colorDec$.pipe(
      map(colorDec => intToHex(colorDec))
    )

    // give different instructions on how to get details with control included
    clone.details$ = combineLatest([
      light.details$,
      clone.colorDec$,
    ]).pipe(
      map(([details, colorDec]) => {
        const newDetails: LightDetails = { ...details, colorDec }
        return newDetails
      })
    )

    const lightAndControl = await remapPlayerControlsToLight(
      player,
      //romControl,
      clone,
      ledBlinky
    )

    return lightAndControl
  }
}

/** Primary function to connect which layout light belongs to which game light config
 * - CAUTION: When no match, creates default
*/
async function remapPlayerControlsToLight(
  player: NewPlayer,
  light: Light,
  ledBlinky: LedBlinky, // curve$: Observable<number>
): Promise<LightAndControl | undefined> {  
  let control: PlayerControl | undefined
  const iControls = player.controls
  const lightDetails = await firstValueFrom(light.details$)

  const proms = iControls.map(async iControl => {
    const colorDec = lightDetails.colorDec || 0
    // reset all lights to blank
    light.colorDec$.next(colorDec) // resetting to black
    
    // default to change-able color
    light.cssColor$ = combineLatest([
      light.colorDec$,
      ledBlinky.curve$
    ]).pipe(
      map(([colorDec, curve]) => castColorDetailsToCssColor(
        intToHex(colorDec), ledBlinky.colors, curve
      ))
    )

    // see if we match remapping
    const layoutLabel = await firstValueFrom(iControl.layoutLabel$)

    // ✅ MATCHED! compare matchControlToLight(iControl) === lightDetails.name
    if (layoutLabel === lightDetails.name ) {
      control = iControl
    
      // matches need color controlled by game control layout
      light.cssColor$ = ledBlinky.curve$.pipe(
        map((curve) => castControlDetailsToCssColor(
          iControl.xml.details, // details.color is what is used
          ledBlinky.colors,
          curve
        ))
      )
    }
  })

  await Promise.all(proms)

  // NOT FOUND 🤷
  if ( !control ) {
    return // could not be matched
  }

  return new LightAndControl(light, control, ledBlinky, player)
}


export interface ConfigWiz {
  [name: string]: IniNameValuePairs;
}

export interface AvailControlsMap {
  [playerIndex: string]: {
    name: string;
    inputCode: string;
  }[];
}

export async function getAvailControlsMap(
  inputsMap: InputsMap,
  controlDefaults: ControlDefaults
) {
  const uniqueNames: {
    [player: string]: {
      [name: string]: string[];
    };
  } = {};

  const promises = controlDefaults.controls.map(async (x: ControlDefault) => {
    const details = x.xml.details;
    const name = details.name;
    const inputCodes = x.getInputCodes();

    if (!inputCodes || name.charAt(0) === '_') {
      return;
    }

    const playerIndex = details.allowConfigPlayerNum;
    if (!playerIndex) {
      return;
    }

    const uniquePlayer = (uniqueNames[playerIndex] =
      uniqueNames[playerIndex] || {});
    const keyCodes = (uniquePlayer[name] = uniquePlayer[name] || []);
    const newCodes = inputCodes.filter((x: string) => !keyCodes.includes(x));
    keyCodes.push(...newCodes);
  });

  await Promise.all(promises);

  const all: AvailControlsMap = {};

  Object.entries(uniqueNames).forEach(([playerIndex, controls]) => {
    all[playerIndex] = [];
    Object.entries(controls).forEach(([name, inputCodes]) => {
      const isNameMatch =
        name.slice(0, 2) === 'P' + playerIndex ||
        name.charAt(name.length - 1) === playerIndex;

      let found: UniqueInputCode | undefined = inputsMap.inputCodes.find(
        (x) => {
          const isPlayerMatch = x.labels.find(
            (label) =>
              label.slice(0, 2) === 'P' + playerIndex ||
              label === 'JOYSTICK' + playerIndex
          );

          // const codeMatch = x.inputCode && inputCodes.find(code => code === x.inputCode)

          if (isPlayerMatch && isNameMatch) {
            return x;
          }

          const isCommon = playerIndex === '0'; // && !isPlayerMatch
          if (isCommon) {
            return x;
          }

          return;
        }
      );

      if (!found) {
        return;
      }

      const match = inputsMap.inputCodes.find(
        (code) => code.inputCode && inputCodes.includes(code.inputCode)
      );
      let inputCode = '';
      if (match) {
        found = match;
        inputCode = found.inputCode;
      }

      all[playerIndex].push({ name, inputCode: inputCode });
    });
  });

  return all;
}

export function mapPortElm(element: Element) {
  const details = elmAttributesToObject(element) as PortDetails;
  return new Port(element, details)
}

export function registerPorts(
  port: Port,
  labels: UniqueInputLabel[],
  inputCodes: UniqueInputCode[]
) {
  let labelIndex = labels.findIndex((x) => x.label === port.details.label);
  if (labelIndex < 0) {
    labels.push({ label: port.details.label, inputCodes: [] });
    labelIndex = labels.length - 1;
  }

  if (!labels[labelIndex].inputCodes.includes(port.details.inputCodes)) {
    labels[labelIndex].inputCodes.push(port.details.inputCodes);
  }

  let codeIndex = inputCodes.findIndex(
    (x) => x.inputCode === port.details.inputCodes
  );
  if (codeIndex < 0) {
    inputCodes.push({ inputCode: port.details.inputCodes, labels: [] });
    codeIndex = inputCodes.length - 1;
  }

  if (!inputCodes[codeIndex].labels.includes(port.details.label)) {
    inputCodes[codeIndex].labels.push(port.details.label);
  }
}

export function fileTryLoadingPipes(
  file: string,
  directory$: Observable<DirectoryManager>
) {
  return directory$.pipe(
    mergeMap((dir) => {
      console.debug(`💾 Loading file ${file}...`)
      return from(loadFileByDir(file, dir))
    }),
    switchMap((result) => {
      if (!result.file) {
        const directory = result.dir;
        console.warn(`cannot find file ${directory.path} ${file}`);
        return EMPTY; // cancel the pipe
      }

      console.debug(`💾 Loaded file object ${file}`)

      return of(result.file);
    }),
    // take(1), // ensure Observable closes???
  )
}

async function loadFileByDir(fileName: string, dir: DirectoryManager) {
  const file = await dir.findFileByPath(fileName);
  return { dir, file };
}


export function getNameAveragesByControls$(
  controls: PlayerControl[],
  inputCode: string
) {
  const all = {} as { [name: string]: number };
  
  return from(controls).pipe(
    mergeMap((control: PlayerControl, index) => 
      of(control.getInputCodes().includes(inputCode) ? controls[index].xml.details : null)
    ),
    map(details => {
      if ( !details ) {
        return null
      }
      
      all[details.name] = all[details.name] || 0
      all[details.name] = all[details.name] + 1
      return null
    }),
    take(controls.length),
    map(() => all),
  )
}

export function addMissingControlsToLightControls(
  player: NewPlayer,
  lightAndControls: LightAndControl[],
  ledBlinky: LedBlinky
) {
  player.controls.forEach((allControl, index) => {
    const name = allControl.xml.details.name
    const found = lightAndControls.find(lightControl => {
      return lightControl.control.xml.details.name === name || lightControl.control.getDecodedName() === allControl.getDecodedName()
    })
    
    if ( found ) {
      return // control is already present, most likely as a differently named button (two configs same target)
    }

    const skipByName = ['CONTROL_JOY8WAY','CONTROL_JOY4WAY'].includes(name)
    if ( skipByName ) {
      return
    }
    
    const lightDetails: LightDetails = {
      name: name || 'N/A',
      x: 0, // (80 * player.playerIndex) + (player.playerIndex * index),
      y: (player.playerIndex ? 10 : 0) + (player.playerIndex * (index * 10)),
      colorDec: 0,
      diameter: 10,
    }

    const light = new Light(lightDetails)
    
    // provide color override
    light.cssColor$ = ledBlinky.curve$.pipe(
      map((curve) => castControlDetailsToCssColor(
        allControl.xml.details, // details.color is what is used
        ledBlinky.colors,
        curve
      ))
    )

    lightAndControls.push(
      new LightAndControl(light, allControl, ledBlinky, player)
    )
  })
}

export async function getMissingLights(
  lights: Light[],
  inputsMap: InputsMap
): Promise<Light[]> {
  // return lights.filter(light => !inputsMap.labels.find(name => name.label === light.name))
  const promises = lights.map(light => firstValueFrom(light.details$))
  
  const details = await Promise.all(promises)
  
  const missing = inputsMap.labels.filter(
    label => label.label && !details.find(light => light.name === label.label)
  )

  return missing.map(miss => {
    const details: LightDetails = {
      name: miss.label,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 10,
    }
    const light: Light = new Light(details)

    return light
  })
}

export interface LightDrag {
  light: Light
  startOffsetY: number
  startOffsetX: number
  startX: number
  startY: number
}

export function getControlGamepadCode(control: Control) {
  const button = control.gamepadButton
  if ( button != undefined ) {
    return button.toString()
  }
  
  return `${control.gamepadAxis||''}${control.gamepadDirection||''}`
}