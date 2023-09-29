
import { Component, Input } from '@angular/core'
import { DirectoryManager, FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'
import { firstValueFrom } from 'rxjs'
import { SessionProvider } from '../session.provider'
import { BackupFile, findBackupInDirByName, getFileBackupList, slowArrayMapPromises } from './backups.utils'

export const loadingText = '⏱ Loading...'

@Component({
  selector: 'directory-backups',
  templateUrl: './backups.component.html',
})
export class BackupsComponent {
  @Input() directory!: DirectoryManager
  @Input() path?: string
  @Input() fileName?: string
  
  loading: number = 0
  columns: (DmFileReader | DirectoryManager | FileStats)[][] = []
  backupsFound: string[] = []
  sourceFile?: DmFileReader
  backupFiles: BackupFile[] = []
  parent?: DirectoryManager
  toRestore?: {stats:FileStats, backupFolder:DirectoryManager}
  
  constructor(public session: SessionProvider) {}

  async ngOnInit() {
    if ( !this.directory ) {
      return
    }

    const path = this.path || ''

    // incase this is a native like app and full paths are used everywhere
    const correctedPath = path.replace(this.directory.path,'')

    // no await
    this.loadByPath(correctedPath, this.directory)
    
    const otherDir = await this.directory.findDirectory( correctedPath )
    if ( otherDir ) {
      await this.preloadFile(otherDir)
    }
  }

  async preloadFile(dir: DirectoryManager) {
    if ( !this.fileName || !dir ) {
      return
    }
    
    const file = await dir.findFileByPath(this.fileName)
    if ( !file ) {
      return
    }

    return this.loadItem(file, dir)
  }

  async loadByParent(
    path: string,
    parent: DirectoryManager
  ): Promise<DirectoryManager> {
    if ( !path.length ) {
      return parent
    }

    const pathSplit = path.split('/')
    const firstPath = pathSplit.shift() as string
    const dir = await parent.findDirectory(firstPath)

    if ( !dir ) {
      return parent
    }

    try {
      await this.loadFolders(dir)
    } catch (err) {
      this.session.error('#loadByParent',err);
    }
    
    const tryNext = pathSplit.join('/')
    return this.loadByParent(tryNext, dir)
  }
  
  async loadByPath(
    path: string,
    parent?: DirectoryManager
  ): Promise<DirectoryManager> {
    parent = parent || this.directory as DirectoryManager
    await this.loadFolders(parent) // ensure parent is on in the Finder columns
    return this.loadByParent(path, parent)
  }

  async loadItem(
    item: DmFileReader | DirectoryManager | FileStats,
    parent: DirectoryManager
  ) {
    const dirLike = (item as DirectoryManager)
    const isDir = dirLike.path // on DirectoryManager has a path
    if ( isDir ) {
      await this.loadFolders(this.parent = dirLike)
      return
    }
    
    ++this.loading

    // is this a filestat?
    if ( !(item as any).directory ) {
      item = await parent.file(item.name)
    }

    // load backups for a file
    this.sourceFile = item as DmFileReader
    const sourceFileName = item.name
    const buFolderNames = this.session.config.backupFolderNames
    this.backupFiles.length = 0
    this.backupFiles = await getFileBackupList(sourceFileName, parent, buFolderNames)
    --this.loading
  }

  async loadFolders(
    dir: DirectoryManager
  ) {
    ++this.loading
    this.parent = dir
    this.backupsFound.length = 0
    
    const folders: DirectoryManager[] = await dir.getFolders()
    const folderNames = folders.map(folder => folder.name)
    const columnItems = folders.map(folder => {
      (folder as any).kind = 'DIRECTORY'
      return folder
    }) as (DirectoryManager | DmFileReader | FileStats)[]
    
    this.columns.push(columnItems) // folderNames.map(name => ({name, kind: 'DIRECTORY'}))
    this.loadFilesWithBackups(dir, folderNames, columnItems)
  }

  async loadFilesWithBackups(
    dir: DirectoryManager,
    folderNames: string[],
    columnItems: (DirectoryManager | DmFileReader | FileStats)[],
  ): Promise<string[]> {
    const buFolderNames = this.session.config.backupFolderNames
    const backupsFound = buFolderNames.filter(x => folderNames.includes(x))
    this.backupsFound.push( ...backupsFound )

    // lookup files in the current folder
    if ( backupsFound ) {
      const promise = dir.getFiles().then((files: DmFileReader[]) => {
        // async find files with backups
        return firstValueFrom(
          slowArrayMapPromises(files, 0, async file => {
            return firstValueFrom(
              slowArrayMapPromises(backupsFound, 0, async backupFolderName => {
                const matchFound = await findBackupInDirByName(dir, backupFolderName, file.name)
                if ( matchFound ) {
                  file.stats().then((stats: FileStats) => {
                    if ( columnItems.find(column => column.name === stats.name) ) {
                      return // we already know we have a backup for this file
                    }

                    columnItems.push(stats)
                    columnItems.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
                  })
                  return // don't check any other backups folders
                }
              })
            )
          })
        )
  
        // await Promise.all(loading)
      })
      
      await promise
      // columnItems.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
      --this.loading
    }

    return this.backupsFound
  }

  async restore() {
    if ( !this.parent || !this.toRestore || !this.sourceFile ) {
      this.session.error('missing requirements to restore file')
      return
    }

    const confirmFile: DmFileReader = await this.toRestore.backupFolder.file(this.toRestore.stats.name)
    const backupText = await confirmFile.readAsText()
    
    delete this.toRestore
    
    this.session.toSaveFiles.push({
      file: this.sourceFile,
      string: backupText,
    })
  }

  async back() {
    this.columns.pop()
    if ( !this.parent || !this.parent.path ) {
      return
    }

    const parentPathSplit = this.parent.path.split('/')
    parentPathSplit.pop()
    const parentPath = parentPathSplit.join('/')
    if ( parentPath ) {
      this.parent = await this.directory?.findDirectory(parentPath)
    }
  }

  async confirmRestore(stats: BackupFile) {
    if ( !this.parent ) {
      return
    }

    const backupFolder = await this.parent.getDirectory(stats.backupFolderName, { create: true })
    this.toRestore = {stats, backupFolder}
  }

  async showPreviewFile(stats: BackupFile, parent: DirectoryManager) {   
    const file = await parent.file(stats.name)
    ++this.loading
    this.session.filePreview = {
      file, string: await file.readAsText()
    }
    --this.loading
  }
}
