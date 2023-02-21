
import { Component, Input } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { DirectoryManager, DmFileReader, FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { concatMap, delay, firstValueFrom, from, map, mergeMap, Observable, of, OperatorFunction, throttleTime, toArray } from 'rxjs'
import { SessionProvider } from '../session.provider'

declare type BackupFile = FileStats & {
  backupFolderName: string
  backupFolder: DirectoryManager
}

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

    // no await
    this.loadByPath(path, this.directory)
    
    const otherDir = await this.directory.getDirectory( path )
    await this.preloadFile(otherDir)
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
    const dir = await parent.getDirectory(firstPath)

    if ( dir ) {
      try {
        await this.loadFolders(dir)
      } catch (err) {
        console.error('#loadByParent',err);
      }
    }
    
    return this.loadByParent(pathSplit.join('/'), dir)
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
    // load backups for a file
    this.sourceFile = item as DmFileReader
    const sourceFileName = item.name
    const buFolderNames = this.session.config.backupFolderNames
    this.backupFiles.length = 0
    this.backupFiles = await getFileBackupList(sourceFileName, parent, buFolderNames)
    --this.loading
  }

  async loadFolders(dir: DirectoryManager) {
    ++this.loading
    this.parent = dir
    this.backupsFound.length = 0
    
    const folders = await dir.getFolders()
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
  ) {
    const buFolderNames = this.session.config.backupFolderNames
    this.backupsFound.push( ...buFolderNames.filter(x => folderNames.includes(x)) )

    // lookup files in the current folder
    if ( this.backupsFound ) {
      dir.getFiles().then(files => {
        // async find files with backups
        return firstValueFrom(
          slowArrayMapPromises(files, 10, async file => {
            return firstValueFrom(
              slowArrayMapPromises(this.backupsFound, 10, async backupFolderName => {
                const matchFound = await findBackupInDirByName(dir, backupFolderName, file.name)
                if ( matchFound ) {
                  file.stats().then(stats => {
                    columnItems.push(stats)
                  })
                  return // don't check any other backups folders
                }
              })
            )
          })
        )
  
        // await Promise.all(loading)
      })
      

      columnItems.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
      --this.loading
    }
  }

  async restore() {
    if ( !this.parent || !this.toRestore || !this.sourceFile ) {
      return
    }

    const confirmFile = await this.toRestore.backupFolder.file(this.toRestore.stats.name)
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
      this.parent = await this.directory?.getDirectory(parentPath)
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

async function getBackupsInDirByName(
  dir: DirectoryManager,
  backupFolderName: string,
  fileName: string
): Promise<DmFileReader[]> {
  const backupDir = await dir.findDirectory(backupFolderName)

  if ( !backupDir ) {
    return []
  }

  const backupFiles = await backupDir.listFiles()
  const buFileNames = filterNameInBackupFiles(fileName, backupFiles)
  const promises = buFileNames.map(fileName => backupDir.file(fileName))
  const fileLoads = Promise.all(promises)
  return fileLoads
}

async function findBackupInDirByName(
  dir: DirectoryManager,
  backupFolderName: string,
  fileName: string
) {
  const backupDir = await dir.getDirectory(backupFolderName)
  const backupFiles = await backupDir.listFiles()
  return findNameInBackupFiles(fileName, backupFiles)
}

function findNameInBackupFiles(name: string, backupFiles: string[]) {
  const splitName = name.split('.')
  splitName.pop() // remove extension
  const searchName = splitName.join('.').toLowerCase()
  return backupFiles.find(buFile => buFile.toLowerCase().includes(searchName))
}

function filterNameInBackupFiles(name: string, backupFiles: string[]) {
  const splitName = name.split('.')
  splitName.pop()
  const searchName = splitName.join('.').toLowerCase()
  return backupFiles.filter(buFile => buFile.toLowerCase().includes(searchName))
}

export async function getFileBackupList(
  sourceFileName: string,
  parent: DirectoryManager,
  buFolderNames: string[],
): Promise<BackupFile[]> {
  const backupFiles: BackupFile[] = []
  await Promise.all(
    buFolderNames.map(async buFolderName => {
      const matches = await getBackupsInDirByName(parent, buFolderName, sourceFileName)
      
      // Apply the throttle to the mapped values using the 'throttleTime' operator
      const mappedItems$ = slowArrayMapPromises(matches, 10, file => {
        return file.stats()
      })
      
      const loadStats: FileStats[] = await firstValueFrom(mappedItems$)
      const statPromises = loadStats.map(async stat => {
        const castStat = stat as BackupFile
        castStat.backupFolderName = buFolderName
        castStat.backupFolder = await parent.getDirectory(buFolderName)
        return stat as BackupFile
      })
      const stats = await Promise.all(statPromises)
      backupFiles.push(...stats)
      return
    })
  )

  // this.backupFiles.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
  backupFiles.sort((a,b)=>Number(b.lastModified)-Number(a.lastModified))
  return backupFiles
}


export function slowArrayMapPromises<T, Z>(
  array: T[],
  speed: number,
  callback: (value: T, index: number) => Promise<Z>
): Observable<Z[]> {
  return from(array).pipe(
    concatMap((item, index) => of(item).pipe(
      delay(speed),
      mergeMap(value => from(
        callback(value, index)
      ))
    )),
    toArray()
  )
}
