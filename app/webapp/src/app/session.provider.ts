import { EventEmitter, Injectable, NgZone } from '@angular/core'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { copyToClipboard, getOs, getStorage, saveStorage } from './app.utilities'
import { LaunchBox } from './launchbox/LaunchBox.class'
import { LedBlinky } from './ledblinky/LedBlinky.class'
import { PlatformsMapping } from './platforms'
import packageJson from '../../package.json'
import { get } from './app.utilities'
import { TipOptions, Tips } from './tips.class'

import platforms from './platform.map.json'
import { Mame } from './ledblinky/mame.class'
import { BehaviorSubject, map, shareReplay } from 'rxjs'
import { getControlGamepadCode } from './ledblinky/LedBlinky.utils'
import { fillGaps, getPerformance, openAnchor, WriteFile } from './session.utils'
import { EmulatorControls } from './ledblinky/EmulatorControls'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'
import { xmlDocToString } from './xml.functions'
import { Emulator } from './ledblinky/Emulator.class'

@Injectable()
export class SessionProvider {
  constructor(
    private ngZone: NgZone
  ) {
    this.reloadPlatforms()
    this.loadLocalStorage()

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

  tips = new Tips()
  
  loads = 0
  load$ = new BehaviorSubject( this.loads )
  loading$ = this.load$.pipe(
    map(amount => this.loads = this.loads + amount),
    shareReplay(1),
  )
  
  os = getOs()
  
  platforms: PlatformsMapping = platforms as any
  mame = new Mame(this)
  // xarcade loaded directly (TODO: move to a class like ledblink and launchbox)
  xarcadeDirectory?: DirectoryManager
  
  filePreview?: WriteFile
  toSaveFiles: WriteFile[] = []
  $filesSaved = new EventEmitter<WriteFile[]>()
  filesReadyToSave: WriteFile[] = []

  appDirectory$ = new EventEmitter<DirectoryManager>()

  // Default storage
  config = {
    showWarn: true,
    backupFolderNames: ['_backups', '_backup', '[backup]'],
    appFolder: {
      path: '', // backup folder explorer
    },
    xarcadeXinput: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Tools\\xarcade-xinput' : ''),
    },
    ledBlinky: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Tools\\LEDBlinky' : ''),
      curve: 0,
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

  config$ = new BehaviorSubject(this.config)

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
  reportIssueLink = `https://github.com/AckerApple/mega-aide/issues/new?title=Mega-aide app issue: &body=My issue is:${encodeURIComponent('\n\n\nMy debug info is:\n' + JSON.stringify(this.debugData, null, 2))}`
  
  performance: any = getPerformance() // performance as any // may not be available in all browsers

  // Must be last
  launchBox = new LaunchBox(this)
  ledBlinky = new LedBlinky(this, this.ngZone)

  requestToSave() {
    this.toSaveFiles = [...this.filesReadyToSave]
  }

  addFileToSave(file: WriteFile) {
    let findIndex = this.filesReadyToSave.findIndex(x => x.file === file.file)
    if ( findIndex >= 0 ) {
      this.info(`File has changes. Ready to save at bottom of page. Saved file ${file.file.directory.path}/${file.file.name}`)
      this.filesReadyToSave[findIndex].string = file.string
      return // already ready to save, just update string
    }

    this.filesReadyToSave.push(file)
    this.info(`File has changes. Ready to save at bottom of page. Saved file ${file.file.directory.path}/${file.file.name}`)
  }

  saveFileXml(
    file: DmFileReader,
    xml: Document
  ) {
    const rawString = xmlDocToString(xml)
    // remove extra lines and then add a closing extra line return
    const string = rawString.replace(/\n\s+\n/g,'\n') + '\r'
    this.addFileToSave({ file, string })
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

  async loadLocalStorage() {
    try {
      const storage = await getStorage() as any
      console.debug('🧠 storage', storage)
      const newConfig = storage || this.config
      
      fillGaps(newConfig, this.config)

      this.config = newConfig
      this.config$.next(this.config)
      console.debug('⚙️ this.config', this.config)

      return this.config
    } catch (err) {
      this.error('could not load previous config', err)
    }

    return getStorage()
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

  warn(
    message: string,
    err?: any,
    options?: TipOptions
  ) {
    message = '🟠 ' + message
    console.warn(message, err)
    this.tips.displayForTime(message, 5000, {level:'warn', ...options})
  }

  debug(message: string, err?: any, options?: TipOptions) {
    message = '🔵 ' + message
    console.debug(message, err)
    // this.tips.displayForTime(message, 5000)
  }

  info(message: string, options?: TipOptions) {
    message = 'ℹ ' + message
    console.info(message)
    this.tips.displayForTime(message, 5000, options)
  }

  saveStorage() {
    saveStorage(this.config)
  }

  checkFileStreamingSupport() {
    const hasFileStreaming = window.showDirectoryPicker as unknown
    if ( hasFileStreaming ) {
      return // support is good
    }

    const message = 'Your 🌎 web browser does not support 💾 file streaming.\n\nYou may experience degraded performance or lack of functionality..\n\n👉 This app is best supported by Google Chrome, Opera, or Microsoft Edge'
    this.warn(message, null, {
      showFor: 10000,
      links: [{
        label: 'support chart',
        url: 'https://caniuse.com/?search=window.showDirectoryPicker',
        target: '_blank'
      }]
    })
  }

  copyToClipboard(text: string) {
    copyToClipboard(text)
    this.info(`📋 Copied ${text.length} characters to clipboard`)
  }

  copyUrlHere() {
    const urlHere = this.getRelativeUrl('')
    copyToClipboard(urlHere)
    this.info(`📋 Copied 🔗 URL to this page`)
  }

  copyUrl(url: string) {
    copyToClipboard(url)
    
    this.info(`📋 Copied 🔗 to URL`, {
      links: [{
        url, label: 'visit copied url here',
      }]
    })
  }

  getRelativeUrl(relativeUrl: string) {
    return createRelativeURL(relativeUrl)
  }
}

function createRelativeURL(relativePath: string) {
  // Get the current URL
  const currentURL = window.location.href;
  const currentEmojiURL = decodeURIComponent(currentURL);

  // Split the current URL by "/"
  let urlParts = currentEmojiURL.split('/');

  // Split the relative path by "/"
  let relativeParts = relativePath.split('/');

  // Remove empty parts and handle "../" in the relative path
  for (let i = 0; i < relativeParts.length; i++) {
    if (relativeParts[i] === "..") {
      urlParts.pop(); // Go up one level
    } else if (relativeParts[i] !== "") {
      urlParts.push(relativeParts[i]); // Add non-empty parts
    }
  }

  // Combine the parts to create the new URL
  let newURL = urlParts.join('/');

  return newURL;
}
