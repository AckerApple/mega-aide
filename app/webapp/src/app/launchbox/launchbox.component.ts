import { DirectoryManager, DmFileReader } from '../DirectoryManagers'
import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'

declare const Neutralino: any


@Component({
  templateUrl: './launchbox.component.html',
})
export class LaunchBoxComponent {
  // view?: string
  // window = window as any
  // neutralino = typeof Neutralino === 'object' ? true : false
  // xarcadeDirectory?: DirectoryManager

  constructor(public session: SessionProvider) {}

  async setDirectory(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    if ( !this.session.xarcadeDirectory ) {
      const xarcadePath = 'tools/xarcade-xinput'
      const xarcadeDir = await directoryManager.getDirectory( xarcadePath )  
      if ( xarcadeDir ) {
        this.session.xarcadeDirectory = xarcadeDir
        // notate that the link was found via LaunchBox for back and forth jumping
        this.session.launchBoxXarcadeDir = xarcadeDir
      }
    }
  }
}
