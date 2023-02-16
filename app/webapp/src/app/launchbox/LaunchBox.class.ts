import { DirectoryManager, DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { AdditionalApp, AdditionalAppDetails, AdditionalAppType, GameDetails, GameInsight, PlatformInsights, SessionProvider } from "../session.provider"
import { BehaviorSubject, combineLatest, EMPTY, firstValueFrom, from, map, mergeMap, Observable, of, shareReplay, Subject, Subscription, switchMap } from "rxjs"
import { getElementsByTagName } from "../ledblinky/LedBlinky.utils"
import { findElementText, getGameElementId, getGameElementTitle, isPathKillXinput, isPathXinput } from "./detect-issues/detect.utils"
import { fileTryLoadingPipes } from "../ledblinky/LedBlinky.class"

/* when done with this class you must .destroy() it */
export class LaunchBox {
  directoryChange = new BehaviorSubject<DirectoryManager | undefined>( undefined )
  directory$: Observable<DirectoryManager> = this.directoryChange.pipe(
    switchMap(dir => {
      if ( !dir ) {
        return EMPTY
      }

      return new Observable<DirectoryManager>(subscriber => {
        // look for known directories
        dir.findDirectory('Data/Platforms')
          .then(platforms => {
            if ( !platforms ) {
              this.session.error('Selected 🧰 LaunchBox folder does not appear to be correct. Could not find confirmation folder Data/Platforms')
              return
            }

            // load ledblinky and more
            this.findOtherDirs(dir)

            subscriber.next(dir)
          })
      })
    }), // continue if directory defined otherwise cancel pipe
    shareReplay(1), // once we have a defined directory, remember for new subs
  )

  // xarcade loaded from launchbox tools dir
  xarcadeDir?: DirectoryManager

  // ledBlinky loaded from launchbox tools dir
  ledBlinkyDir?: DirectoryManager

  directories$ = this.directory$.pipe(
    mergeMap(directory => from(this.findOtherDirs(directory))),
    shareReplay(1), // once we have a defined directory, remember for new subs
  )
  subs = new Subscription()

  platformsFile$ = fileTryLoadingPipes(
    'Data/Platforms.xml',
    this.directory$,
  )

  platformNames$ = this.platformsFile$.pipe(
    mergeMap(platformFile => {
      return platformFile.readXmlElementsByTagName('Platform')
      .then((platformElms) => {
        const namedElements: Element[] = []
        platformElms.forEach(x => {
          namedElements.push( ...getElementsByTagName(x, 'Name') )
        })
        
        return namedElements.map(x => x.textContent as string).sort((a,b)=>String(a||'').toLowerCase()>String(b||'').toLowerCase()?1:-1)
      })
    })
  )

  constructor(public session: SessionProvider) {
  }

  async findOtherDirs(directory: DirectoryManager) {
    const [mame, xinput, ledBlinky] = await Promise.all([
      this.tryAddMame(directory),
      this.tryAddXinputByTools(directory),
      this.tryAddLedBlinkyByTools(directory),
    ])

    return { mame, xinput, ledBlinky }
  }

  async tryAddXinputByTools(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'tools/xarcade-xinput'
    const xarcadeDir = await directoryManager.findDirectory( path )  

    if ( !xarcadeDir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    // this.session.info('Found XArcade XInput from LaunchBox')
    this.session.xarcadeDirectory = xarcadeDir
    // notate that the link was found via LaunchBox for back and forth jumping
    return this.session.launchBox.xarcadeDir = xarcadeDir
  }

  async tryAddLedBlinkyByTools(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'tools/LEDBlinky'
    const dir = await directoryManager.findDirectory( path )  
    
    if ( !dir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    // this.session.info('Found LEDBlinky from LaunchBox')
    this.session.ledBlinky.directoryChange.next( dir )
    // notate that the link was found via LaunchBox for back and forth jumping
    return this.session.launchBox.ledBlinkyDir = dir
  }

  async tryAddMame(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'emulators/MAME'
    const dir = await directoryManager.findDirectory( path )  

    if ( !dir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    return this.session.mame.directory = dir
  }

  platformFiles$ = combineLatest([
    this.platformNames$,
    this.directory$,
  ]).pipe(
    map(([platformNames, directory]) => {
      const results: {name: string, file: DmFileReader}[] = []
      const result$ = new Subject<{name: string, file: DmFileReader}>()
  
      for (let index=0; index < platformNames.length; ++index) {
        const name = platformNames[index]
        directory.findFileByPath(`Data/Platforms/${name}.xml`).then(file => {
          if ( !file ) {
            return
          }
          const result = {name, file}
          results.push(result)
          result$.next(result)

          if ( index === platformNames.length-1 ) {
            result$.complete()
          }
        })
      }
      
      return { results, result$ }
    })
  )

  /** loops all platform.xml files creates a filtered map of valid return results  */
  async eachPlatform<EachResult>(
    each: (
      platformFile: PlatformInsights,
      on: {stop: () => any}
    ) => EachResult,
    { platformName }: { platformName?: string } = {}
  ): Promise<EachResult[]> {
    let platformNames = await firstValueFrom(this.platformNames$)

    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return []
    }

    if ( platformName ) {
      platformName = platformName.toLowerCase()
      platformNames = platformNames.filter(name => name.toLowerCase() === platformName)
    }

    let stopped = false
    const stop = () => {
      stopped = true
    }

    const results: EachResult[] = []
    for (const name of platformNames) {
      if ( stopped ) {
        break
      }

      const platformFile = await this.getPlatformFileByName(directory, name)
      if ( !platformFile ) {
        continue
      }

      const result = await each(platformFile, {stop})
      results.push(result)
    }

    return results
  }

  async getPlatformFileByName(
    directory: DirectoryManager,
    name: string,
  ): Promise<PlatformInsights| undefined> {
    return this.getPlatformFileByFileName(directory, name + '.xml')
  }

  async getPlatformFileByFileName(
    directory: DirectoryManager,
    name: string,
  ): Promise<PlatformInsights| undefined> {
    const file = await directory.findFileByPath(`Data/Platforms/${name}`) as DmFileReader

    if ( !file ) {
      return
    }

    const platformFile = await this.getPlatformFileDetails(name as string, file)  
    return platformFile
  }
  
  async getPlatformFileDetails(
    name: string,
    file: DmFileReader
  ): Promise<PlatformInsights> {
    const xml = await file.readAsXml()

    const controllerSupports$ = new Observable<ControllerSupport[]>(subscriber => {
      const control: ControllerSupport[] = getElementsByTagName(xml, 'GameControllerSupport')
        .map(elm => mapControllerSupport(elm)
      )
      subscriber.next(control)
    })/*.pipe(
      shareReplay(1)
    ) as unknown as Observable<ControllerSupport[]>*/

    const games$: Observable<GameInsight[]> = new Observable(subscriber => {  
      const games: GameInsight[] = getElementsByTagName(xml, 'Game')
      .map(element => {
        const details = elementToGameDetails(element)
        const gameInsights: GameInsight = {
          element, details,
          
          controllerSupports$: new Observable<ControllerSupport[]>(subscriber => {
            const elms = getElementsByTagName(xml, 'GameControllerSupport')
            const mapped = elms.map(elm => mapControllerSupport(elm))
            const supports: ControllerSupport[] = mapped
              .filter(support => support.details.gameId === details.id)
            subscriber.next(supports)
          })
        }
        return gameInsights
      })
      subscriber.next(games)
    }).pipe(
      shareReplay(1)
    ) as unknown as Observable<GameInsight[]>
    
    const additionalApps$ = new Observable<AdditionalApp[]>(subscriber => {
      const apps: AdditionalApp[] = getElementsByTagName(xml, 'AdditionalApplication')
        .map(elm => mapAdditionalApp(elm))
      subscriber.next(apps)
    })

    const getGameById = async (
      gameId: string
    ): Promise<GameInsight | undefined> => {
      return (await firstValueFrom(games$)).find(game => game.details.id === gameId)
    }

    return {
      xml, name, file,
      
      games$,

      getGameById,
      additionalApps$,
      controllerSupports$,
    }
  }

  async loadData(
    fileName: string
  ): Promise<DmFileReader | undefined> {
    const filePath = 'Data/' + fileName
    const directory = this.directoryChange.getValue()
    
    if ( !directory ) {
      return
    }

    const platformFile = await directory.findFileByPath(filePath)
    
    if ( !platformFile ) {
      this.session.error(`Launchbox Data file not found ${filePath}`)
      return
    }
    return platformFile
  }

  filterAdditionalAppsByGame(
    additionalApps: AdditionalApp[],
    game: GameDetails
  ) {
    const gameId = game.id
    return additionalApps.filter(app => {
      const elms = app.element.getElementsByTagName('GameID')
      if ( !elms.length ) {
        return
      }
      return elms[0].textContent === gameId
    })
  }

  filterGamesByAppElement(
    games: GameInsight[],
    app: Element
  ) {
    const elms = app.getElementsByTagName('GameID')
    if ( !elms.length ) {
      return
    }
    const gameId = elms[0].textContent
    return this.filterGamesById(games, gameId as string)
  }

  filterGamesById(games: GameInsight[], gameId: string) {
    return games.filter(game => game.details.id === gameId)
  }

  removeXinputFromApps(apps: AdditionalApp[]) {
    apps.map((app, index) => ({app, index}))
      .filter(app => [
        AdditionalAppType.XINPUT,
        AdditionalAppType.XINPUT_KILL
      ].includes(app.app.details.type))
      .reverse()
      .forEach(app => removeAppFromApps(app.app, apps))
  }
}

export function removeAppFromApps(
  app: AdditionalApp,
  apps: AdditionalApp[]
) {
  // remove from xml
  app.element.parentNode?.removeChild(app.element)

  const index = apps.indexOf(app)

  if ( index < 0 ) {
    return
  }

  // remove from apps array
  apps.splice(index, 1)
}

interface ChildAndText {
  child: Element
  text: string
}

function getChildElementAndText(
  element: Element,
  tagName: string
): ChildAndText | undefined {
  const matches = element.getElementsByTagName(tagName)  
  const child = matches[0]

  if ( !child ) {
    return
  }

  const text = child.textContent || ''
  return { child, text }
}

function getTypeByAddApp(applicationPath: string): AdditionalAppType {
  if ( isPathXinput(applicationPath) ) {
    return AdditionalAppType.XINPUT
  }

  if ( isPathKillXinput(applicationPath) ) {
    return AdditionalAppType.XINPUT_KILL
  }
  
  return AdditionalAppType.OTHER
}

export function elementToGameDetails(
  element: Element
): GameDetails {
  const details: GameDetails = {
    title: getGameElementTitle(element) as string,
    id: getGameElementId(element) as string,
    favorite: findElementText(element, 'Favorite') === 'true' ? true : false,
    applicationPath: findElementText(element, 'ApplicationPath') as string
  }
  return details
}

interface ControllerSupportDetails {
  controllerId: string
  gameId: string
  supportLevel?: string
}

export interface ControllerSupport {
  element: Element
  details: ControllerSupportDetails
  
  controllerIdElement: Element
  gameIdElement: Element
  supportLevelElement?: Element
}

export function mapControllerSupport(
  element: Element
): ControllerSupport {
  const controllerId = getChildElementAndText(element, 'ControllerId') as ChildAndText
  const gameId = getChildElementAndText(element, 'GameId') as ChildAndText
  const supportLevel = getChildElementAndText(element, 'SupportLevel')

  const details: ControllerSupportDetails = {
    controllerId: controllerId.text,
    gameId: gameId.text,
    supportLevel: supportLevel?.text,
  }

  return {
    element,
    details,
    controllerIdElement: controllerId?.child,
    gameIdElement: gameId?.child,
    supportLevelElement: supportLevel?.child,
  }
}

export function mapAdditionalApp(element: Element): AdditionalApp {
  const applicationPath = getChildElementAndText(element, 'ApplicationPath') as ChildAndText
  const commandLine = getChildElementAndText(element, 'CommandLine')
  const autoRunAfter = getChildElementAndText(element, 'AutoRunAfter')
  const autoRunBefore = getChildElementAndText(element, 'AutoRunBefore')
  const name = getChildElementAndText(element, 'Name')

  const details: AdditionalAppDetails = {
    type: getTypeByAddApp(applicationPath.text),
    commandLine: commandLine?.text || '',
    applicationPath: applicationPath?.text,
    autoRunAfter: autoRunAfter?.text,
    autoRunBefore: autoRunBefore?.text,
    name: name?.text,
  }
  
  return {
    element, details,
    commandLineElement: commandLine?.child,
    applicationPathElement: applicationPath?.child,
    autoRunAfterElement: autoRunAfter?.child,
    autoRunBeforeElement: autoRunBefore?.child,
    nameElement: name?.child,
  }
}
