import { Component } from '@angular/core'
import { DmFileReader, FileStats } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { combineLatest, firstValueFrom, lastValueFrom, map, mergeMap } from 'rxjs'
import { SessionProvider } from 'src/app/session.provider'
import { readFileStream, readWriteFile } from './stream-file.utils'

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

  async fixPlatformSupports() {
    const dir = await firstValueFrom(this.session.launchBox.directory$)
    const file = await dir.file('test.txt')
    // const webFile = (file as any).getFile() as File
    const webFileHandle = (file as any).file as FileSystemFileHandle
    
    let lastSliceLeftOvers: string | undefined
    const seenSupports: string[] = []

    readWriteFile(webFileHandle, (string: string, { isLast }) => {
      // did we take a slice of a slice on the last stream?
      if ( lastSliceLeftOvers ) {
        string = lastSliceLeftOvers + string // add the held value to this stream
        lastSliceLeftOvers = undefined
      }

      const lastUnclosedTag = getLastUnclosedTagByName(string, 'GameControllerSupport')
      if ( !isLast && lastUnclosedTag ) {
        lastSliceLeftOvers = string.slice(lastUnclosedTag.index, string.length)
        string = string.slice(0, lastUnclosedTag.index)
      }
      
      const regx = new RegExp('( *<GameControllerSupport(.|\n|\r)*?>(.|\n|\r)*?<\/GameControllerSupport>\s*)', 'gi')
      const toRemove: {index: number, length: number}[] = []
      let matches: any
      while ((matches = regx.exec(string)) != null) {
        removeFrom(matches, seenSupports, toRemove)
      }
      
      toRemove.reverse().forEach(({index, length}) => {
        string = string.slice(0, index-1) + string.slice(index + length, string.length)
      })
      
      return string
    })
  }

  async scanPlatform(platform: PlatformScan) {
    this.session.load$.next(1)
    const file = (platform.file as any).file
    const realFile = await file.getFile()
    
    const xmlStats = platform.xmlStats = { games: 0, gameControllerSupports: 0 }

    // review file in slices and count things
    const sub = readFileStream(realFile, 1024 * 2).pipe(
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
        sub.unsubscribe()
      },
    })
  }
}

function getLastUnclosedTagByName(
  string: string,
  tagName: string,
): RegExpExecArray | undefined {
  const regx = new RegExp(`<${tagName}[^>]*(?!.*<\/${tagName}+>)`, 'gi')
  let lastMatch: RegExpExecArray | null
  let lastGoodMatch: RegExpExecArray | undefined

  while ((lastMatch = regx.exec(string)) != null) {
    lastGoodMatch = lastMatch
  }
  
  return lastGoodMatch
}

function xmlToObj(xmlString: string) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  const obj: {[index: string]: string | null} = {}
  const nodes = xmlDoc.getElementsByTagName('*')

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    obj[node.nodeName] = node.textContent
  }

  return obj;
}

function removeFrom(
  matches: RegExpExecArray,
  seenSupports: string[],
  toRemove: {index: number, length: number}[]
) {
  const {ControllerId, GameId, SupportLevel} = xmlToObj(matches[0])
  const keyValue = `${ControllerId}:${GameId}:${SupportLevel}`

  if ( (seenSupports as any).includes(keyValue) ) {
    toRemove.push({index: matches.index, length: matches.length})
  } else {
    seenSupports.push(keyValue)
    console.log('first')
  }

  return toRemove
}