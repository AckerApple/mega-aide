import { Injectable } from "@angular/core"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { SessionProvider } from "./session.provider"

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'

@Injectable()
export class XArcadeXInputProvider {
  directory!: DirectoryManager
  mappingFileNames: string[] = []

  constructor(public session: SessionProvider) {}
  
  async loadMappings() {
    const pathTo = 'xarcade-xinput/mappings'
    try {
      const mappings = await this.directory.getDirectory(pathTo)
      const files = await mappings.listFiles()
      this.mappingFileNames = files.filter(file => file.name.split('.').pop() === 'json').map(file => file.name.replace('.json',''))
    } catch (err) {
      this.session.error(`Error loading XArcade mappings folder ${pathTo}`,err)
      throw err
    }
  }
}
