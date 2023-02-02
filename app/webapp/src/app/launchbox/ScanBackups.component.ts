import { Component } from '@angular/core'
import { DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { Subscription } from 'rxjs'
import { getFileBackupList } from '../components/backups.component'
import { createBackupOfFile } from '../components/save-files.component'
import { SessionProvider } from '../session.provider'

interface Scan {
  path: string
  filePath: string
  fileName: string
  found: boolean
  hasBackup: boolean

  isOld?: boolean
  lastBackupDate?: Date
}

@Component({
  templateUrl: './ScanBackups.component.html',
  animations,
})
export class ScanBackupsComponent {
  subs = new Subscription()

  scans: Scan[] = [{
    filePath: 'Data/Settings.xml',
    found: false,
    hasBackup: false,
  }, {
    filePath: 'Data/BigBoxSettings.xml',
    found: false,
    hasBackup: false,
  }, {
    filePath: 'Data/Emulators.xml',
    found: false,
    hasBackup: false,
  }, {
    filePath: 'Data/Platforms.xml',
    found: false,
    hasBackup: false,
  }].map((x: Partial<Scan>) => {
    const pathSplit = (x as any).filePath.split('/')
    x.fileName = pathSplit.pop() as string
    x.path = pathSplit.join('/')
    return x as Scan
  })
  
  constructor(public session: SessionProvider) {
    this.load()

    this.subs.add(
      this.session.launchBox.directoryChange.subscribe(() => {
        this.load()
      })
    )
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  async load() {
    const directory = this.session.launchBox.directory
    if ( !directory ) {
      return
    }

    ++this.session.loading
    const promises = this.scans.map(async scan => {
      const file = await directory.findFileByPath(scan.filePath)
      if ( !file ) {
        return
      }

      scan.found = true
      const fileName = scan.filePath.split('/').pop() as string
      const buNames = this.session.config.backupFolderNames
      const backups = await getFileBackupList(fileName, file.directory, buNames)
      scan.hasBackup = backups.length ? true : false

      if ( backups.length ) {
        backups.forEach(backup => {
          const isMoreRecent = !scan.lastBackupDate || (backup.lastModifiedDate && scan.lastBackupDate < backup.lastModifiedDate)
          scan.lastBackupDate = isMoreRecent ? backup.lastModifiedDate : scan.lastBackupDate
        })

        if ( scan.lastBackupDate ) {
          const year = scan.lastBackupDate.getFullYear()
          const cYear = new Date().getFullYear()
          const yearDiff = cYear - year

          if ( yearDiff > 1 ) {
            scan.isOld = true
            return
          }
          
          const month = scan.lastBackupDate.getMonth()
          const cMonth = new Date().getMonth() + (yearDiff * 12)
          console.log('xxx', cMonth - month)
          if ( cMonth - month > 2 ) {
            scan.isOld = true
            return
          }
        }
      }
    })

    await Promise.all(promises)
    --this.session.loading
  }

  async createBackupOfScan(scan: Scan) {
    ++this.session.loading
    
    const launchDir = this.session.launchBox.directory
    if ( !launchDir ) {
      --this.session.loading
      return
    }
    
    const file = await launchDir.findFileByPath( scan.filePath )
    if ( !file ) {
      --this.session.loading
      return
    }

    
    await createBackupOfFile(file, this.session.config.backupFolderNames)
    --this.session.loading
    
    await this.load()
  }
}