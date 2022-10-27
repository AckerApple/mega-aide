import { Component } from '@angular/core'
import { DirectoryManager } from './DirectoryManagers'
import { SessionProvider } from './session.provider'
import { openAnchor } from './app.component'

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'

@Component({
  templateUrl: './xarcade-xinput.component.html',
})
export class XarcadeXinputComponent {
  xarcadeXinputPickerId = xarcadeXinputPickerId
  openAnchor = openAnchor
  viewMoreInfo? = false
  configHasChanges? = false
  mappingFileNames: string[] = []

  constructor(public session: SessionProvider) {
    if ( this.session.xarcadeDirectory ) {
      this.readDir( this.session.xarcadeDirectory )
    }
  }

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
