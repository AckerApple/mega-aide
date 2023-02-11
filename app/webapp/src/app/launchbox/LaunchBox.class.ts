import { DirectoryManager, DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { AdditionalApp, AdditionalAppDetails, AdditionalAppType, GameDetails, GameInsight, PlatformInsights, SessionProvider } from "../session.provider"
import { BehaviorSubject, bindCallback, EMPTY, from, mergeMap, Observable, of, shareReplay, Subscription, switchMap } from "rxjs"
import { getElementsByTagName } from "../ledblinky/LedBlinky.utils"
import { findElementText, getGameElementId, getGameElementTitle, isPathKillXinput, isPathXinput } from "./detect-issues/detect.utils"

/* when done with this class you must .destroy() it */
export class LaunchBox {
  directoryChange = new BehaviorSubject<DirectoryManager | undefined>( undefined )
  directory$ = this.directoryChange.pipe(
    switchMap(c => c ? of(c) : EMPTY), // continue if directory defined otherwise cancel pipe
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

  constructor(public session: SessionProvider) {
  }

  async findOtherDirs(directory: DirectoryManager) {
    await Promise.all([
      this.tryAddMame(directory),
      this.tryAddXinputByTools(directory),
      this.tryAddLedBlinkyByTools(directory),
    ])
  }

  async tryAddXinputByTools(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'tools/xarcade-xinput'
    const xarcadeDir = await directoryManager.findDirectory( path )  

    if ( !xarcadeDir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    this.session.xarcadeDirectory = xarcadeDir
    // notate that the link was found via LaunchBox for back and forth jumping
    this.session.launchBox.xarcadeDir = xarcadeDir
  }

  async tryAddLedBlinkyByTools(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'tools/LEDBlinky'
    const dir = await directoryManager.findDirectory( path )  

    if ( !dir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    this.session.ledBlinky.directoryChange.next( dir )
    // notate that the link was found via LaunchBox for back and forth jumping
    this.session.launchBox.ledBlinkyDir = dir
  }

  async tryAddMame(directoryManager: DirectoryManager) {
    // attempt to set xarcade path by launch box tools path
    const path = 'emulators/MAME'
    const dir = await directoryManager.findDirectory( path )  

    if ( !dir ) {
      this.session.warn(`Cannot find ${path} folder`)
      return
    }

    this.session.mame.directory = dir
  }

  async getPlatformNames(): Promise<string[]> {
    const platformFile = await this.session.launchBox.loadData('Platforms.xml')

    if ( !platformFile ) {
      return []
    }

    const platformElms = await platformFile.readXmlElementsByTagName('Platform')
    const namedElements: Element[] = []
    platformElms.forEach(x => {
      namedElements.push( ...getElementsByTagName(x, 'Name') )
    })
    
    return namedElements.map(x => x.textContent as string).sort((a,b)=>String(a||'').toLowerCase()>String(b||'').toLowerCase()?1:-1)
  }

  async getPlatformFiles(): Promise<{name: string, file: DmFileReader}[]> {
    const platformNames = await this.getPlatformNames()
    const results: {name: string, file: DmFileReader}[] = []
    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return results
    }

    for (const name of platformNames) {
      const file = await directory.findFileByPath(`Data/Platforms/${name}.xml`) as DmFileReader

      if ( !file ) {
        continue
      }
      
      results.push({name, file})
    }
    
    return results
  }

  /** loops all platform.xml files creates a filtered map of valid return results  */
  async eachPlatform<EachResult>(
    each: (
      platformFile: PlatformInsights,
      on: {stop: () => any}
    ) => EachResult
  ): Promise<EachResult[]> {
    const platformFile = await this.session.launchBox.loadData('Platforms.xml')

    if ( !platformFile ) {
      return []
    }

    const platformElms = await platformFile.readXmlElementsByTagName('Platform')
    const namedElements: Element[] = []
    platformElms.forEach(elm => {
      namedElements.push(...getElementsByTagName(elm,'Name'))
    })

    let stopped = false
    const stop = () => {
      stopped = true
    }

    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return []
    }

    const results = []
    for (const element of namedElements) {
      if ( stopped ) {
        break
      }

      const name = element.textContent as string
      const platformFile = await this.getPlatformFileByName(directory, name)

      if ( !platformFile ) {
        continue
      }

      const result = await each(platformFile, {stop})
      results.push(result)
    }

    return results.filter(x => x) as EachResult[]
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
    const gameElements = getElementsByTagName(xml, 'Game') as Element[]
    const games = gameElements.map(element => {
      const gameInsights: GameInsight = {
        element,
        details: elementToGameDetails(element),
      }
      return gameInsights
    })

    // TODO: create a page to read duplicates
    const controllerSupports$ = new Observable(subscriber => {
      const control: ControllerSupport[] = getElementsByTagName(xml, 'GameControllerSupport')
        .map(elm => mapControllerSupport(elm)
      )
      subscriber.next(control)
    }).pipe(
      shareReplay(1)
    ) as unknown as Observable<ControllerSupport[]>

    const additionalApps$ = new Observable(subscriber => {
      const app: AdditionalApp[] = getElementsByTagName(xml, 'AdditionalApplication')
      .map(elm => mapAdditionalApp(elm)
      )
      subscriber.next(app)
    }).pipe(
      shareReplay(1)
    ) as unknown as Observable<AdditionalApp[]>

    const getGameById = (
      gameId: string
    ): (GameInsight | undefined) => {
      return games.find(game => game.details.id === gameId)
    }

    return {
      xml, name, file, games,

      getGameById,
      additionalApps$,
      controllerSupports$,
    }
  }

  async loadData(fileName: string): Promise<DmFileReader | undefined> {
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
