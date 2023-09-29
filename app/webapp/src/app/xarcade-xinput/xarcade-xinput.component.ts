import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'
import { XArcadeXInputProvider } from './XArcadeXInput.provider'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { Prompts } from 'ack-angular'
import { firstValueFrom } from 'rxjs'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'
import { openAnchor } from '../session.utils'

export const xarcadeXinputPickerId = 'xarcadeXinputPicker'

@Component({
  animations,
  templateUrl: './xarcade-xinput.component.html'
})
export class XarcadeXinputComponent { 
  openAnchor = openAnchor
  configHasChanges? = false

  constructor(
    public xarcade: XArcadeXInputProvider,
    public session: SessionProvider,
    public prompts: Prompts,
  ) {
    if ( this.session.xarcadeDirectory ) {
      this.readDir( this.session.xarcadeDirectory )
    }
  }

  saveFiles() {
    this.configHasChanges = false
  }

  async readDir( directoryManager: DirectoryManager ) {
    this.session.xarcadeDirectory = directoryManager
    this.xarcade.directoryChange.next( directoryManager )
  }

  async addFile() {
    const mappings = await firstValueFrom(this.xarcade.mappings$)
    
    if ( !mappings ) {
      return
    }

    const name = 'new-mapping-file' + mappings.length + '.json'
    const mapDir = await this.xarcade.findMappingsDir()
    
    if ( !mapDir ) {
      return
    }

    const newFile = await mapDir.file(name, { create: true })
    await newFile.write('{}')
    const stats = await newFile.stats()
    mappings.push(stats)
  }

  async removeByParent(parent: DirectoryManager, item: DmFileReader) {
    const confirm = await firstValueFrom(
      this.prompts.confirm(`Confirm delete file ${item.name}`)
    )

    if ( !confirm ) {
      return
    }

    parent = parent || await this.xarcade.findMappingsDir()
    await parent.removeEntry(item.name)
    const mappings = await firstValueFrom(this.xarcade.mappings$)
    
    if ( !mappings ) {
      return
    }
    
    const index = mappings.findIndex(x => x.name === item.name)
    mappings.splice(index, 1)
  }
}
