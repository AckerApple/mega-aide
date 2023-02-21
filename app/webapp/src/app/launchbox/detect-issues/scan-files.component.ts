import { Component } from '@angular/core'
import { Prompts } from 'ack-angular'
import { DmFileReader, FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { combineLatest, firstValueFrom, lastValueFrom, map, mergeMap, Observable } from 'rxjs'
import { SessionProvider } from 'src/app/session.provider'
import { ContentTagReader, getMatchCount } from './ContentTagReader.class'
import { readFileStream, readWriteFile } from './stream-file.utils'

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
    
    supportDupsFound$: Observable<number>
    supportDupsFixed$: Observable<number>
    
    altNameDupsFound$: Observable<number>
    altNameDupsFixed$: Observable<number>
  }
}

@Component({
  animations,
  templateUrl: './scan-files.component.html',
}) export class ScanFilesComponent {
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
        map(result => {
          result.file.stats().then(async stats => {
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

    // const dir = await firstValueFrom(this.session.launchBox.directory$)
    // const file: DmFileReader = await dir.file('test.txt')
    const file: DmFileReader = platform.file
    const webFileHandle = (file as any).file as FileSystemFileHandle

    const supportReader = new ContentTagReader('GameControllerSupport')
    const nameReader = new ContentTagReader('AlternateName')

    xmlStats.supportDupsFixed$ = supportReader.duplicatesFixed$ // connect things found to the display
    xmlStats.supportDupsFound$ = supportReader.duplicatesFound$ // connect things found to the display

    xmlStats.altNameDupsFixed$ = nameReader.duplicatesFixed$ // connect things found to the display
    xmlStats.altNameDupsFound$ = nameReader.duplicatesFound$ // connect things found to the display

    this.session.load$.next(1)
    ++platform.load

    await readWriteFile(webFileHandle, (string: string, { isLast, percent }) => {      
      platform.percentRead = percent
      string = supportReader.rewriteString(string, isLast)
      string = nameReader.rewriteString(string, isLast)
      return string
    })

    this.scanPlatform(platform)
    this.session.load$.next(-1)
    --platform.load
  }

  // readonly
  async scanPlatform(
    platform: PlatformScan
  ) {
    this.session.load$.next(1)
    ++platform.load
    const file = (platform.file as any).file
    const realFile = await file.getFile()
    platform.file.stats().then(stats => platform.stats = stats)
    const supportReader = new ContentTagReader('GameControllerSupport')
    const nameReader = new ContentTagReader('AlternateName')
    
    const xmlStats = platform.xmlStats = platform.xmlStats || {
      games: 0,
      gameControllerSupports: 0,
      alternateNames: 0,
      
      supportDupsFound$: supportReader.duplicatesFound$,
      supportDupsFixed$: supportReader.duplicatesFixed$,
      
      altNameDupsFound$: nameReader.duplicatesFound$,
      altNameDupsFixed$: nameReader.duplicatesFixed$,
    }
    
    // these need to be reset before each scan
    xmlStats.games = 0
    xmlStats.gameControllerSupports = 0
    xmlStats.alternateNames = 0

    // todo, need rejection handling
    return new Promise((res, _rej) => {
      const close = () => {
        --platform.load
        this.session.load$.next(-1)
        sub.unsubscribe()
        res( platform )
      }
  
      // review file in slices and count things
      const sub = readFileStream(realFile, 1024 * 3, (string, {isLast, percent}) => {
        platform.percentRead = percent
        supportReader.examineString(string, isLast)
        nameReader.examineString(string, isLast)
      }).pipe(
        map(string => {
          const gameMatches = getMatchCount(/<Game>/g, string)
          const supportMatches = getMatchCount(/<GameControllerSupport>/g, string)
          const alternateNames = getMatchCount(/<AlternateName>/g, string)

          xmlStats.games = xmlStats.games + gameMatches
          xmlStats.gameControllerSupports = xmlStats.gameControllerSupports + supportMatches
          xmlStats.alternateNames = xmlStats.alternateNames + alternateNames
        })
      )
      .subscribe({
        error: close,
        complete: close,
      })
    })
  }

  async scanPlatforms(platforms: PlatformScan[]) {
    for (const platform of platforms) {
      await this.scanPlatform(platform)
    }
  }
}
