import { EventEmitter, Injectable } from '@angular/core'
import { DirectoryManager, DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { getOs, getStorage, saveStorage } from './app.utilities'
import { getControlGamepadCode } from './inputs/platform-player-control.component'
import { LaunchBox } from './launchbox/LaunchBox.class'
import { LedBlinky } from './ledblinky/LedBlinky.class'
import { PlatformsMapping } from './platforms'
import packageJson from '../../package.json'
import { openAnchor } from './app.component'
import { get } from './app.utilities'
import { Tips } from './tips.class'

import platforms from './platform.map.json'
import { Mame } from './ledblinky/mame.class'

@Injectable()
export class SessionProvider {
  tips = new Tips()
  loading = 0
  
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

  constructor() {
    this.reloadPlatforms()
    this.loadConfig()
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
}

export interface PlatformInsights {
  xml: Document
  name: string
  file: DmFileReader
  games: GameInsight[]
  additionalApps: Element[],
}

export interface GameInsight {
  element: Element
  details: GameDetails
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

export interface AdditionalApp {
  type: AdditionalAppType
  element: Element
 
  autoRunAfter: string
  autoRunAfterElement: Element
  
  autoRunBefore: string
  autoRunBeforeElement: Element
  
  name: string
  nameElement: Element

  applicationPath: string
  applicationPathElement: Element

  commandLine: string
  commandLineElement: Element
}
