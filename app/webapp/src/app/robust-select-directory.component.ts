import { Component, EventEmitter, Input, Output } from '@angular/core'
import { directoryReadToArray } from './app.utilities'
import { BrowserDirectoryManager } from './BrowserDirectoryManagers'
import { DirectoryManager, NeutralinoDirectoryManager } from './DirectoryManagers'
import { SafariDirectoryManager } from './SafariDirectoryManagers'

declare const Neutralino: any

@Component({
  selector: 'robust-select-directory',
  templateUrl: './robust-select-directory.component.html',
})
export class RobustSelectDirectoryComponent {
  window: any = window
  @Input() label!: string // "LaunchBox"
  @Input() pickerId?: string // ensures loaded path is same as previous
  @Input() reloadPath?: string // C:\blah\blah
  @Output() error = new EventEmitter<Error>()
  @Output() directoryManagerChange = new EventEmitter<DirectoryManager>()

  getPickerId() {
    return this.pickerId || this.getId().replace(/[ -_]/g,'')
  }
  
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
        const boxDir = await this.window.showDirectoryPicker({
          id: this.getPickerId(),
          // id: this.getId(),
          mode: 'readwrite'
        })
        const boxFiles = await directoryReadToArray( boxDir )
        const dm = new BrowserDirectoryManager('', boxFiles, boxDir)
        this.directoryManagerChange.emit(dm)
        return
      } catch (err: any) {
        if ( err.message.includes('aborted') ) {
          return
        }
        this.error.emit(err)
      }
    }

    // safari
    this.showDirectoryPicker()
  }

  getId() {
    return 'robustFolderPicker-' + this.label
  }

  showDirectoryPicker() {
    document.getElementById(this.getId())?.click()
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
