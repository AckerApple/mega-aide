import { Component, EventEmitter, Input, Output } from '@angular/core'
import { SessionProvider } from '../session.provider'
import { WriteFile } from '../session.utils'
import { createBackupOfFile } from './backups.utils'

@Component({
  selector: 'save-files',
  templateUrl: './save-files.component.html',
  providers: [],
}) export class SaveFilesComponent {
  @Input() toWrite: WriteFile[] = []
  @Output() toWriteChange = new EventEmitter<WriteFile[]>()
  @Output() saved = new EventEmitter<WriteFile[]>()
  @Output() canceled = new EventEmitter<void>()
  saving: number = 0
  saveWithBackupFolder = true

  constructor(public session: SessionProvider) {}

  async save() {
    if ( !this.toWrite ) {
      return
    }

    await Promise.all(
      this.toWrite.map(async item => {        
        try {
          if ( this.saveWithBackupFolder ) {
            ++this.saving
  
            const backup = await createBackupOfFile(
              item.file,
              this.session.config.backupFolderNames
            )

            this.session.info(`✅ ↩️ Saved file backup ${backup.directory.path}/${backup.name}`)
            
            --this.saving
          }
          
          ++this.saving
          const promise = await item.file.write(item.string)
          this.session.info(`✅ 💾 Saved file ${item.file.directory.path}/${item.file.name}`)
          --this.saving
          
          return promise  
        } catch (err) {
          this.saving = 0
          const errMess = (err as any).message as string
          this.session.error('Error saving files: ' + errMess, err)
        }
      })
    )

    this.saved.emit(this.toWrite)
    this.cancel()
  }

  cancel() {
    this.toWrite.length = 0
    this.toWriteChange.emit(this.toWrite)
  }
}
