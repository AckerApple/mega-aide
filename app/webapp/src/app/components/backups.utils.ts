import { DirectoryManager, FileStats } from "ack-angular-components/directory-managers/DirectoryManagers"
import { DmFileReader } from "ack-angular-components/directory-managers/DmFileReader"
import { Observable, concatMap, delay, firstValueFrom, from, mergeMap, of, toArray } from "rxjs"

export declare type BackupFile = FileStats & {
  backupFolderName: string
  backupFolder: DirectoryManager
}

/** file name searching for a backup file */
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

export async function findBackupInDirByName(
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

/** file name filtering for a backup file */
function filterNameInBackupFiles(name: string, backupFiles: string[]) {
  // array split by periods and remove an empty arrays that may occur for something like ".DS_STORE"
  const splitName = name.split('.').filter(x => x)
  
  if ( splitName.length > 1 ) {
    splitName.pop() // remove file extension
  }
  
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

export async function createBackupOfFile(
  file: DmFileReader,
  backupFolderNames: string[]
): Promise<DmFileReader> {
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
  return backupFile
}
