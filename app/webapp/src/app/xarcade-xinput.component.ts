import { Component } from '@angular/core'
import { DirectoryManager } from './DirectoryManagers'
import { SessionProvider } from './session.provider'
import { openAnchor } from './app.component'

@Component({
  templateUrl: './xarcade-xinput.component.html',
})
export class XarcadeXinputComponent {
  openAnchor = openAnchor
  viewMoreInfo? = false
  configHasChanges? = false
  mappingFileNames: string[] = []

  constructor(public session: SessionProvider) {}

  saveFiles() {
    console.log('time to save...')
    this.configHasChanges = false
  }
  
  async readDir( directoryManager: DirectoryManager ) {
    this.session.xarcadeDirectory = directoryManager

    const mappings = await directoryManager.getDirectory('xarcade-xinput/mappings')
    const files = await mappings.listFiles()
    this.mappingFileNames = files.filter(file => file.name.split('.').pop() === 'json').map(file => file.name)
  }
}
