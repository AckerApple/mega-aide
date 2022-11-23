import { Component, EventEmitter, Input, Output } from '@angular/core'
import { directoryReadToArray } from './app.utilities'
import { BrowserDirectoryManager } from './BrowserDirectoryManagers'
import { DirectoryManager } from './DirectoryManagers'
import { NeutralinoDirectoryManager } from './NeutralinoDirectoryManager'
import { SafariDirectoryManager } from './SafariDirectoryManagers'

declare const Neutralino: any

@Component({
  selector: 'robust-select-directory',
  templateUrl: './robust-select-directory.component.html',
})
export class RobustSelectDirectoryComponent {
  @Input() label!: string // "LaunchBox"
  @Input() pickerId?: string // ensures loaded path is same as previous
  @Input() reloadPath?: string // C:\blah\blah
  @Output() error = new EventEmitter<Error>()
  @Input() directoryManager?: DirectoryManager
  @Output() directoryManagerChange = new EventEmitter<DirectoryManager>()

  getPickerId() {
    return this.pickerId || this.getId().replace(/[ -_]/g,'')
  }
  
  async onPathReload(path: string) {
    if ( typeof Neutralino === 'object' ) {
      const dm = new NeutralinoDirectoryManager(path)
      this.directoryManagerChange.emit(this.directoryManager = dm)
    }
  }

  async selectPath() {
    const isNeu = typeof Neutralino === 'object'
    if ( isNeu ) {
      let response = await Neutralino.os.showFolderDialog()
      if ( response ) {
        this.reloadPath = response
        const dm = new NeutralinoDirectoryManager(response)
        this.directoryManagerChange.emit(this.directoryManager = dm)
      }
      return
    }

    const canPickDir = window.showDirectoryPicker as any

    // chrome
    if ( canPickDir ) {  
      try {
        const boxDir = await window.showDirectoryPicker({
          id: this.getPickerId(),
          // id: this.getId(),
          mode: 'readwrite'
        })
        const boxFiles = await directoryReadToArray( boxDir )
        const dm = new BrowserDirectoryManager('', boxFiles, boxDir)
        this.directoryManagerChange.emit(this.directoryManager = dm)
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
      this.error.emit(new Error('no directory with files selected'))
      return // no files selected
    }

    const files = Object.entries(input.files).filter(([key]) => key != 'length').map(([_key, value]) => value) as File[]
    const dm = new SafariDirectoryManager('', files)
    this.directoryManagerChange.emit(this.directoryManager = dm)
  }
}
