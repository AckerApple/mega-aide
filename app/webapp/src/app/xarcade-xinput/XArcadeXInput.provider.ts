import { Injectable } from "@angular/core"
import { DirectoryManager, FileStats } from "ack-angular-components/directory-managers/DirectoryManagers"
import { SessionProvider } from "../session.provider"

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'
const pathTo = 'xarcade-xinput/mappings'

@Injectable()
export class XArcadeXInputProvider {
  directory!: DirectoryManager
  // mappingFileNames: string[] = []
  mappingFiles: FileStats[] = []

  constructor(public session: SessionProvider) {}
 
  autoLoadDir(): DirectoryManager | undefined {
    if ( this.session.xarcadeDirectory ) {
      return this.directory = this.session.xarcadeDirectory
    }

    if ( !this.session.launchBox.xarcadeDir ) {
      return
    }

    return this.directory = this.session.launchBox.xarcadeDir
  }

  async findMappingsDir() {
    let mappings = await this.directory.findDirectory('mappings')

    if ( mappings ) {
      return mappings
    }
    
    return await this.directory.findDirectory(pathTo)
  }

  async loadMappings() {
    if ( !this.directory ) {
      this.autoLoadDir()
      if ( !this.directory ) {
        this.session.warn('xarcade xinput directory has not been loaded')
        return
      }
    }

    const mappings = await this.findMappingsDir()
    
    if ( !mappings ) {
      this.session.warn(`unable to locate "mappings" or "${pathTo}" 📁 folder(s) within ${this.directory.path}`)
      return
    }
    
    try {
      const files = await mappings.getFiles()
      
      this.mappingFiles = await Promise.all(
        files.filter(file => file.name.split('.').pop() === 'json')
        .map(file => file.stats())
      )

    } catch (err) {
      this.session.error(`Error loading XArcade mappings folder ${pathTo}`,err)
      throw err
    }
  }
}
