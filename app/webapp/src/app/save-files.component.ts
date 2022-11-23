import { Component, EventEmitter, Input, Output } from '@angular/core'
import { WriteFile } from './session.provider'

@Component({
  selector: 'save-files',
  templateUrl: './save-files.component.html',
  providers: [],
}) export class SaveFilesComponent {
  @Input() toWrite?: WriteFile[]
  @Output() toWriteChange = new EventEmitter<WriteFile[]>()
  @Output() saved = new EventEmitter<WriteFile[]>()
  saving: number = 0
  saveWithBackupFolder = true

  async save() {
    if ( !this.toWrite ) {
      return
    }

    await Promise.all(
      this.toWrite.map(async item => {
        
        if ( this.saveWithBackupFolder ) {
          ++this.saving
          const backupFolder = await item.file.directory.getDirectory('_backup', { create: true })
          const nameSplit = item.file.name.split('.')
          const frontName = nameSplit.splice(0, nameSplit.length-1).join('.')
          const ext = nameSplit.pop()
          const newFileName = frontName + '-BU' + Date.now() + '.' + ext
          
          const backupFile = await backupFolder.file(newFileName, { create: true })
          await backupFile.write(await item.file.readAsText())
          
          --this.saving
        }
        
        ++this.saving
        const promise = await item.file.write(item.string)
        --this.saving
        
        return promise
      })
    )

    this.saved.emit(this.toWrite)
    this.toWrite.length = 0
    this.toWriteChange.emit(this.toWrite)
  }
}
