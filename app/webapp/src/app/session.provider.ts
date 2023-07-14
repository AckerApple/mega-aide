import { EventEmitter, Injectable } from '@angular/core'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { getOs, getStorage, saveStorage } from './app.utilities'
import { getControlGamepadCode } from './inputs/platform-player-control.component'
import { ControllerSupport, LaunchBox } from './launchbox/LaunchBox.class'
import { LedBlinky } from './ledblinky/LedBlinky.class'
import { PlatformsMapping } from './platforms'
import packageJson from '../../package.json'
import { openAnchor } from './app.component'
import { get } from './app.utilities'
import { Tips } from './tips.class'

import platforms from './platform.map.json'
import { Mame } from './ledblinky/mame.class'
import { BehaviorSubject, map, Observable, shareReplay } from 'rxjs'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'

@Injectable()
export class SessionProvider {
  tips = new Tips()
  
  loads = 0
  load$ = new BehaviorSubject( this.loads )
  loading$ = this.load$.pipe(
    map(amount => this.loads = this.loads + amount),
    shareReplay(1),
  )
  
  os = getOs()
  
  platforms: PlatformsMapping = platforms as any
  launchBox = new LaunchBox(this)
  ledBlinky = new LedBlinky(this)
  mame = new Mame(this)
  // xarcade loaded directly (TODO: move to a class like ledblink and launchbox)
  xarcadeDirectory?: DirectoryManager
  
  filePreview?: WriteFile
  toSaveFiles: WriteFile[] = []
  $filesSaved = new EventEmitter<WriteFile[]>()
  filesReadyToSave: WriteFile[] = []

  config = {
    showWarn: true,
    backupFolderNames: ['_backups', '_backup', '[backup]'],
    xarcadeXinput: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Tools\\xarcade-xinput' : ''),
    },
    ledBlinky: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Tools\\LEDBlinky' : ''),
    },
    mame: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Emulators\\MAME' : ''),
    },
    launchBox: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\' : ''),
      dataFolderName: 'Data',
      bigBoxFileName: 'BigBoxSettings.xml'
    },
  }

  debugData: any = {
    version: packageJson.version,
    navigator: navigator.userAgent,
    NL_OS: get('NL_OS'),
    NL_APPID: get('NL_APPID'),
    NL_PORT: get('NL_PORT'),
    NL_VERSION: get('NL_VERSION'),
    NL_CVERSION: get('NL_CVERSION'),
  }
  openAnchor = openAnchor // due to native os, we need to open <a> href links this way
  reportIssueLink = `https://github.com/AckerApple/mega-aide/issues/new?title=Mega-aide app issue: &body=My issue is:${encodeURIComponent('\n\n\nMy debug info is:\n' + JSON.stringify(this.debug, null, 2))}`
  
  performance: any = getPerformance() // performance as any // may not be available in all browsers

  constructor() {
    this.reloadPlatforms()
    this.loadConfig()

    this.$filesSaved.subscribe(files => {
      files.forEach(file => {
        const index= this.filesReadyToSave.findIndex(lay => lay.file === file.file)
        if ( index >= 0 ) {
          this.filesReadyToSave.splice(index, 1)
        }
      })
    })

    // app performance reporting
    const performanceInterval = setInterval(() => {
      // take a snapshot of only the info we need
      this.performance = getPerformance()

      if ( !this.performance ) {
        clearInterval(performanceInterval) // performance is not trackable
      }
    }, 2000)
  }

  addFileToSave(file: WriteFile) {
    let findIndex = this.filesReadyToSave.findIndex(x => x.file === file.file)
    if ( findIndex >= 0 ) {
      this.filesReadyToSave[findIndex].string = file.string
      return // already ready to save, just update string
    }

    this.filesReadyToSave.push(file)
    this.info(`File has changes. Ready to save at bottom of page. Saved file ${file.file.directory.path}/${file.file.name}`)
  }

  reloadPlatforms() {
    this.platforms.images.forEach(image => {
      image.players.forEach(controls => {
        controls.forEach(control => {
          control.gamepadCode = getControlGamepadCode(control)
        })
      })
    })
  }

  async loadConfig() {
    try {
      const storage = await getStorage() as any
      const newConfig = storage || this.config
      
      fillGaps(newConfig, this.config)

      this.config = newConfig
    } catch (err) {
      this.error('could not load previous config', err)
    }
  }

  error(message: string, err?: any) {
    const displayMessage = '🔴 ' + message
    let debugMsg = displayMessage
    if ( err ) {
      const lastError = Object.getOwnPropertyNames(err).reduce((a, key) => (a[key] = err[key]) && a || a, {} as any) as any
      debugMsg = lastError.message = lastError.message || (err as any).message
    }
    
    console.error(debugMsg, err)
    this.tips.displayForTime(displayMessage, 5000)
  }

  warn(message: string, err?: any) {
    message = '🟠 ' + message
    console.warn(message, err)
    this.tips.displayForTime(message, 5000)
  }

  debug(message: string, err?: any) {
    message = '🔵 ' + message
    console.debug(message, err)
    // this.tips.displayForTime(message, 5000)
  }

  info(message: string) {
    message = 'ℹ ' + message
    console.info(message)
    this.tips.displayForTime(message, 5000)
  }

  save() {
    saveStorage(this.config)
  }
}

function fillGaps (toFill: any, fillFrom: any) {
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


function getPerformance() {
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