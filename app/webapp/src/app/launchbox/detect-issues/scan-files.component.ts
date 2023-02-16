import { Component } from '@angular/core'
import { DmFileReader, FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { combineLatest, lastValueFrom, map, mergeMap } from 'rxjs'
import { SessionProvider } from 'src/app/session.provider'
import { readFileStream } from './stream-file.utils'

interface PlatformScan {
  file: DmFileReader,
  stats: FileStats,
  name: string,

  viewDetails?: boolean
  xmlStats?: {
    games: number
    gameControllerSupports: number
  }
}

@Component({
  animations,
  templateUrl: './scan-files.component.html',
}) export class ScanFilesComponent {
  files$ = combineLatest([
    this.session.launchBox.platformFiles$,
    this.session.launchBox.directory$.pipe(
      map(() => setTimeout(() => this.session.load$.next(1), 0))
    ),
  ]).pipe(
    mergeMap(([{ result$ }]) => {
      const newArray: PlatformScan[] = []
      
      lastValueFrom( result$ ).then(() => this.session.load$.next(-1))
      
      return result$.pipe(
        map(result => {
          result.file.stats().then(async stats => {
            const newResult = { ...result, stats }
            newArray.push(newResult)
          })
          return newArray
        })
      )
    })
  )

  constructor(public session: SessionProvider) {}

  async scanPlatform(platform: PlatformScan) {
    this.session.load$.next(1)
    const file = (platform.file as any).file
    const realFile = await file.getFile()
    
    const xmlStats = platform.xmlStats = { games: 0, gameControllerSupports: 0 }
    readFileStream(realFile, 1024 * 2).pipe(
      map(string => {
        const gameMatches = string.match(/<Game>/)
        const supportMatches = string.match(/<GameControllerSupport>/)
        xmlStats.games = xmlStats.games + (gameMatches?.length || 0)
        xmlStats.gameControllerSupports = xmlStats.gameControllerSupports + (supportMatches?.length || 0)
      })
    ).subscribe({
      /*error: (error) => {
        console.error(error);
      },*/
      complete: () => {
        this.session.load$.next(-1)
      },
    })
  }
}
