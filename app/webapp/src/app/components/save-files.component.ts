import { Component, EventEmitter, Input, Output } from '@angular/core'
import { DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { SessionProvider, WriteFile } from '../session.provider'

@Component({
  selector: 'save-files',
  templateUrl: './save-files.component.html',
  providers: [],
}) export class SaveFilesComponent {
  @Input() toWrite: WriteFile[] = []
  @Output() toWriteChange = new EventEmitter<WriteFile[]>()
  @Output() saved = new EventEmitter<WriteFile[]>()
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
  
            await createBackupOfFile(
              item.file,
              this.session.config.backupFolderNames
            )
            
            --this.saving
          }
          
          ++this.saving
          const promise = await item.file.write(item.string)
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

export async function createBackupOfFile(
  file: DmFileReader,
  backupFolderNames: string[]
) {
  const backupFolderName  = backupFolderNames[0]
  let backupFolder = await file.directory.findDirectory(backupFolderName)
  if ( !backupFolder ) {
    // this.session.warn(`📁 creating folder ${file.directory.path}/${backupFolderName}`)
    backupFolder = await file.directory.createDirectory(backupFolderName)
  }

  const nameSplit = file.name.split('.')
  const frontName = nameSplit.splice(0, nameSplit.length-1).join('.')
  const ext = nameSplit.pop()
  const newFileName = frontName + '-BU' + Date.now() + '.' + ext
  
  const backupFile = await backupFolder.file(newFileName, { create: true })
  const toWrite = await file.readAsText()
  await backupFile.write(toWrite)
}