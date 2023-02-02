import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'
import { openAnchor } from '../app.component'
import { XArcadeXInputProvider } from './XArcadeXInput.provider'
import { DirectoryManager, DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { Prompts } from 'ack-angular'
import { firstValueFrom } from 'rxjs'

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
    this.xarcade.directory = directoryManager
    this.xarcade.loadMappings()
  }

  async addFile() {
    const name = 'new-mapping-file' + this.xarcade.mappingFiles.length + '.json'
    const mapDir = await this.xarcade.findMappingsDir()
    
    if ( !mapDir ) {
      return
    }

    const newFile = await mapDir.file(name, { create: true })
    await newFile.write('{}')
    const stats = await newFile.stats()
    this.xarcade.mappingFiles.push(stats)
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
    const index = this.xarcade.mappingFiles.findIndex(x => x.name === item.name)
    this.xarcade.mappingFiles.splice(index, 1)
  }
}
