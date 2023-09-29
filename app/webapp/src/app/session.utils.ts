import { DmFileReader } from "ack-angular-components/directory-managers/DmFileReader"
import { Observable } from "rxjs"
import { ControllerSupport } from "./launchbox/ControllerSupport.interface"

export declare const Neutralino: any

export function fillGaps (toFill: any, fillFrom: any) {
  // default to this.config for missing entries
  Object.keys(fillFrom).forEach(key => {
    if ( toFill[key] === undefined ) {
      toFill[key] = (fillFrom as any)[key]
    }

    if ( toFill[key] && typeof toFill[key] === 'object' ) {
      fillGaps(toFill[key], fillFrom[key])
    }
  })
}

export interface WriteFile {
  file: DmFileReader
  string: string
  
  // todo: we need streams
  // read$: Observable<string> // needs to be a read stream that closes
}

export interface AdditionalApp {
  details: AdditionalAppDetails // AdditionalAppDetails?
  
  // elements
  element: Element
  
  nameElement?: Element
  autoRunAfterElement?: Element
  autoRunBeforeElement?: Element
  commandLineElement?: Element
  applicationPathElement?: Element
}

export interface PlatformInsights {
  xml: Document
  id: string // fileName with no extension
  fileName: string
  file: DmFileReader
  
  games$: Observable<GameInsight[]>
  getGameById: (id: string) => Promise<GameInsight | undefined>
  additionalApps$: Observable<AdditionalApp[]>
  controllerSupports$: Observable<ControllerSupport[]>
}

export interface XInputGameInsight {
  app: AdditionalApp,
  mapping: string
}

export interface GameInsight {
  element: Element
  details: GameDetails
  
  
  xInput?: XInputGameInsight
  
  // ui controls
  editMapping?: boolean
  
  additionalApps?: AdditionalApp[]
  controllerSupports$: Observable<ControllerSupport[]>
}

export interface GameDetails {
  id: string
  title: string
  favorite: boolean
  applicationPath: string
}

export enum AdditionalAppType {
  XINPUT = 'xinput',
  XINPUT_KILL = 'xinput-kill',
  OTHER = 'other',
}

export interface AdditionalAppDetails {
  commandLine: string
  type: AdditionalAppType
  autoRunAfter?: string
  autoRunBefore?: string
  name?: string
  applicationPath?: string
}


export function getPerformance() {
  if ( !performance ) {
    console.warn('cannot track performance')
    return
  }

  const memory = (performance as any).memory

  if ( !memory ) {
    console.warn('cannot track memory')
    return
  }
  
  return {
    memory: {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.totalJSHeapSize,
    }
  }
}

export function openAnchor(event: Event) {
  if ( typeof Neutralino === 'object' ) {
    const anchor = event.target
    const url = (anchor as Element).getAttribute('href') as string
    openLink(url)
    event.preventDefault() // do not allow app window to be stolen
  }
}

export function openLink(url: string) {
  if ( typeof Neutralino === 'object' ) {
    Neutralino.os.open(url)
  }
}
