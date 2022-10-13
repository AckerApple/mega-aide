import { Component, EventEmitter, Input, Output } from '@angular/core'
import { directoryReadToArray } from './app.utilities'
import { ChromeDirectoryManager, DirectoryManager, NeutralinoDirectoryManager, SafariDirectoryManager } from './DirectoryManagers'

declare const Neutralino: any

@Component({
  selector: 'robust-select-directory',
  templateUrl: './robust-select-directory.component.html',
})
export class RobustSelectDirectoryComponent {
  window: any = window
  @Input() label!: string // "LaunchBox"
  @Input() reloadPath?: string // C:\blah\blah
  @Output() errorChange = new EventEmitter<Error>()
  @Output() directoryManagerChange = new EventEmitter<DirectoryManager>()
  
  async onPathReload(path: string) {
    if ( typeof Neutralino === 'object' ) {
      const dm = new NeutralinoDirectoryManager(path)
      this.directoryManagerChange.emit(dm)        
    }
  }

  async selectPath() {
    const isNeu = typeof Neutralino === 'object'
    if ( isNeu ) {
      let response = await Neutralino.os.showFolderDialog()
      if ( response ) {
        this.reloadPath = response
        const dm = new NeutralinoDirectoryManager(response)
        this.directoryManagerChange.emit(dm)
      }
      return
    }

    // chrome
    if ( this.window.showDirectoryPicker ) {  
      try {
        const boxDir = await this.window.showDirectoryPicker()
        const boxFiles = await directoryReadToArray( boxDir )
        const dm = new ChromeDirectoryManager('', boxFiles, boxDir)
        this.directoryManagerChange.emit(dm)
        return
      } catch (err: any) {
        if ( err.message.includes('aborted') ) {
          return
        }
        this.errorChange.emit(err)
      }
    }
    
    // safari
    this.showDirectoryPicker()
  }

  showDirectoryPicker() {
    document.getElementById('robustFolderPicker')?.click()
  }

  // safari read directory
  async readInputDirectory(input: any) {
    if ( !input.files ) {
      return
    }

    const files = Object.entries(input.files).filter(([key]) => key != 'length').map(([_key, value]) => value) as File[]
    const dm = new SafariDirectoryManager('', files)
    this.directoryManagerChange.emit(dm)
  }
}
