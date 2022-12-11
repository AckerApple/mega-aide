import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'

export class XArcadeXInputProvider {
  directory!: DirectoryManager
  mappingFileNames: string[] = []
  
  async loadMappings() {
    const mappings = await this.directory.getDirectory('xarcade-xinput/mappings')
    const files = await mappings.listFiles()
    this.mappingFileNames = files.filter(file => file.name.split('.').pop() === 'json').map(file => file.name.replace('.json',''))
  }
}
