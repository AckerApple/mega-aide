import { EventEmitter, Injectable } from "@angular/core"
import { DirectoryManager, DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { getOs, getStorage, saveStorage } from "./app.utilities"
import platformMap from './platform.map.json'
import { PlatformsMapping } from "./platforms"

@Injectable()
export class SessionProvider {
  lastError?: Record<string, any>
  os = getOs()
  
  platformMap: PlatformsMapping = platformMap as any

  launchBoxDirectory?: DirectoryManager
  // xarcade loaded from launchbox
  launchBoxXarcadeDir?: DirectoryManager
  // xarcade loaded directly
  xarcadeDirectory?: DirectoryManager
  
  toSaveFiles: WriteFile[] = []
  $filesSaved = new EventEmitter<WriteFile[]>()

  config = {
    xarcadeXinput: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\Tools\\xarcade-xinput' : ''),
    },
    launchBox: {
      path: this.os === 'Darwin' ? '' : (this.os ? 'C:\\Users\\Administrator\\LaunchBox\\' : ''),
      dataFolderName: 'Data',
      bigBoxFileName: 'BigBoxSettings.xml'
    },
  }

  constructor() {
    this.loadConfig()
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
    const lastError = Object.getOwnPropertyNames(err).reduce((a, key) => (a[key] = err[key]) && a || a, {} as any) as any
    lastError.message = lastError.message || err.message
    this.lastError = lastError
    console.error('🔴 ' + message, err)
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