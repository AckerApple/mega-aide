import { Component } from '@angular/core'
import { DirectoryManager } from './DirectoryManagers'
import { SessionProvider } from './session.provider'
import { openAnchor } from './app.component'
import { XArcadeXInputProvider } from './XArcadeXInput.provider'
export const xarcadeXinputPickerId = 'xarcadeXinputPicker'

@Component({
  templateUrl: './xarcade-xinput.component.html'
})
export class XarcadeXinputComponent {
  xarcadeXinputPickerId = xarcadeXinputPickerId
  openAnchor = openAnchor
  configHasChanges? = false
  xarcade = new XArcadeXInputProvider()

  constructor(
    public session: SessionProvider,
  ) {
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
    this.xarcade.directory = directoryManager
    this.xarcade.loadMappings()
  }
}
