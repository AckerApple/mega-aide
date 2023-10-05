import { Component } from '@angular/core'
import { Prompts } from 'ack-angular'
import { FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'
import { animations } from 'ack-angular-fx'
import { combineLatest, firstValueFrom, lastValueFrom, map, mergeMap, Observable } from 'rxjs'
import { SessionProvider } from 'src/app/session.provider'
import { ContentTagReader, getMatchCount } from './ContentTagReader.class'

interface PlatformScan {
  file: DmFileReader,
  stats: FileStats,
  name: string,

  load: number
  percentRead: number

  viewDetails?: boolean
  xmlStats?: {
    games: number
    gameControllerSupports: number
    alternateNames: number
    additionalApps: number
    
    supportDupsFound: number
    supportDupsFixed: number
    
    altNameDupsFound: number
    altNameDupsFixed: number
    
    addAppDupsFound: number
    addAppDupsFixed: number
  }
}

@Component({
  animations,
  templateUrl: './scan-files.component.html',
}) export class ScanFilesComponent {
  chunkSize: number = 1024 * 18 // too low will cause issues

  // raw file names and sizes array
  files$: Observable<PlatformScan[]> = combineLatest([
    this.session.launchBox.platformFiles$,
    this.session.launchBox.directory$.pipe(
      map(() => setTimeout(() => this.session.load$.next(1), 0))
    ),
  ]).pipe(
    mergeMap(([ platformFile ]) => {
      const { result$ } = platformFile
      const newArray: PlatformScan[] = []
      
      // when scanning platform files completes, remove our loading signal
      lastValueFrom( result$ ).then(() => this.session.load$.next(-1))
      
      return result$.pipe(
        map((result) => {
          result.file.stats().then(async (stats: FileStats) => {
            const newResult = { ...result, stats, load: 0, percentRead: 0 }
            newArray.push(newResult)
          })
          return newArray
        })
      )
    })
  )

  constructor(
    public session: SessionProvider,
    public prompts: Prompts,
  ) {}

  /** read and write */
  async fixPlatformSupports(
    platform: PlatformScan
  ) {
    let tooMuch = false
    const backupMessage = `Please ensure you have a backup of ${platform.file.directory.path}/${platform.file.name}`
    const ifAbortMessage = `⚠️ Streaming file process. Once you hit ok, do not close application. If you abort the process or it fails before fully complete, you will have an incomplete file.`
    if (
      !await firstValueFrom(this.prompts.confirm(backupMessage)) ||
      !await firstValueFrom(this.prompts.confirm(ifAbortMessage))
    ) {
      return
    }

    const xmlStats = platform.xmlStats
    if ( !xmlStats ) {
      return
    }

    const file: DmFileReader = platform.file

    const supportReader = new ContentTagReader('GameControllerSupport')
    const nameReader = new ContentTagReader('AlternateName')
    const addAppReader = new ContentTagReader('AdditionalApplication')

    xmlStats.supportDupsFixed = supportReader.duplicatesFixed // connect things found to the display
    xmlStats.supportDupsFound = supportReader.duplicatesFound // connect things found to the display

    xmlStats.altNameDupsFixed = nameReader.duplicatesFixed // connect things found to the display
    xmlStats.altNameDupsFound = nameReader.duplicatesFound // connect things found to the display

    xmlStats.addAppDupsFixed = addAppReader.duplicatesFixed // connect things found to the display
    xmlStats.addAppDupsFound = addAppReader.duplicatesFound // connect things found to the display

    this.session.load$.next(1)
    ++platform.load

    await file.readWriteTextStream((string: string, { isLast, percent }) => {      
      platform.percentRead = percent

      if ( !tooMuch ) {
        // rewrite GameControllerSupport
        string = supportReader.rewriteString(string, isLast)
        // rewrite AlternateName
        string = nameReader.rewriteString(string, isLast)
        // rewrite AdditionalApplication
        string = addAppReader.rewriteString(string, isLast)

        xmlStats.supportDupsFixed = supportReader.duplicatesFixed // connect things found to the display
        xmlStats.supportDupsFound = supportReader.duplicatesFound // connect things found to the display
    
        xmlStats.altNameDupsFixed = nameReader.duplicatesFixed // connect things found to the display
        xmlStats.altNameDupsFound = nameReader.duplicatesFound // connect things found to the display
    
        xmlStats.addAppDupsFixed = addAppReader.duplicatesFixed // connect things found to the display
        xmlStats.addAppDupsFound = addAppReader.duplicatesFound // connect things found to the display    
      }

      return string // this is the string that will be written
    }, this.chunkSize, { awaitEach: false })

    // and then rescan again to update latest stats
    this.scanPlatform(platform)
    this.session.load$.next(-1)
    --platform.load
  }

  // readonly
  async scanPlatform(
    platform: PlatformScan
  ): Promise<void> {
    this.session.load$.next(1)
    ++platform.load

    // platform.file.stats().then(stats => platform.stats = stats)
    
    const supportReader = new ContentTagReader('GameControllerSupport')
    const nameReader = new ContentTagReader('AlternateName')
    const addAppReader = new ContentTagReader('AdditionalApplication')
    
    const xmlStats = platform.xmlStats = platform.xmlStats || {
      games: 0,
      gameControllerSupports: 0,
      alternateNames: 0,
      additionalApps: 0,
      
      supportDupsFound: supportReader.duplicatesFound,
      supportDupsFixed: supportReader.duplicatesFixed,
      
      altNameDupsFound: nameReader.duplicatesFound,
      altNameDupsFixed: nameReader.duplicatesFixed,
      
      addAppDupsFound: addAppReader.duplicatesFound,
      addAppDupsFixed: addAppReader.duplicatesFixed,
    }
    
    // these need to be reset before each scan
    xmlStats.games = 0
    xmlStats.gameControllerSupports = 0
    xmlStats.alternateNames = 0
    xmlStats.additionalApps = 0
    let readCount = 0
    
    const gameRegx = /<Game>/g
    const gameConSupRegx = /<GameControllerSupport>/g
    const altNameRegx = /<AlternateName>/g
    const addAppRegx = /<AdditionalApplication>/g

    await platform.file.readTextStream((string, {isLast, percent, cancel}) => {
      ++readCount
      platform.percentRead = percent
      
      supportReader.examineString(string, isLast) // GameControllerSupport
      nameReader.examineString(string, isLast) // AlternateName
      addAppReader.examineString(string, isLast) // AdditionalApplication

      const gameMatches = getMatchCount(gameRegx, string)
      const supportMatches = getMatchCount(gameConSupRegx, string)
      const alternateNames = getMatchCount(altNameRegx, string)
      const additionalApps = getMatchCount(addAppRegx, string)

      xmlStats.games = xmlStats.games + gameMatches
      xmlStats.gameControllerSupports = xmlStats.gameControllerSupports + supportMatches
      xmlStats.alternateNames = xmlStats.alternateNames + alternateNames
      xmlStats.additionalApps = xmlStats.additionalApps + additionalApps

      xmlStats.supportDupsFound = supportReader.duplicatesFound
      xmlStats.supportDupsFixed = supportReader.duplicatesFixed
      
      xmlStats.altNameDupsFound = nameReader.duplicatesFound
      xmlStats.altNameDupsFixed = nameReader.duplicatesFixed
      
      xmlStats.addAppDupsFound = addAppReader.duplicatesFound
      xmlStats.addAppDupsFixed = addAppReader.duplicatesFixed

      // let garabage collection catchup
      /*if ( readCount >= 100 ) {
        const breakTime = 2000
        return new Promise(res => {
          console.warn(`😅 Taking a ${breakTime / 1000}s break from file streaming to allow memory clear...`)
          setTimeout(() => {
            readCount = 0
            console.warn('▶️ continuing again')
            res(null)
          }, breakTime)
        })
      }*/

      string = '' // try to clear memory

      // return
    }, Number(this.chunkSize), { awaitEach: false })

    --platform.load
    this.session.load$.next(-1)
  }

  async scanPlatforms(platforms: PlatformScan[]) {
    for (const platform of platforms) {
      await this.scanPlatform(platform)
    }
  }
}
