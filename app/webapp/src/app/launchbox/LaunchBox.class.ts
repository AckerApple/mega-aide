import { EventEmitter } from "@angular/core"
import { DirectoryManager, DmFileReader } from "ack-angular-components/directory-managers/DirectoryManagers"
import { findElementText, getGameElementId, getGameElementTitle, isPathKillXinput, isPathXinput } from "./DetectIssues.component"
import { AdditionalApp, AdditionalAppType, GameDetails, GameInsight, PlatformInsights, SessionProvider } from "../session.provider"
import { Subscription } from "rxjs"
import { getElementsByTagName } from "../ledblinky/LedBlinky.utils"

/* when done with this class you must .destroy() it */
export class LaunchBox {
  directory?: DirectoryManager

  // xarcade loaded from launchbox tools dir
  xarcadeDir?: DirectoryManager

  // ledBlinky loaded from launchbox tools dir
  ledBlinkyDir?: DirectoryManager

  directoryChange = new EventEmitter<DirectoryManager>()
  directoriesChange = new EventEmitter<DirectoryManager>() // when xinput, mame, or ledblinky has changed
  subs = new Subscription()

  constructor(public session: SessionProvider) {
    this.directoryChange.subscribe(() => 
      // some tools will rely on "session.xarcade" being loaded first
      this.session.launchBox.onDirectory()
    )
  }

  destroy() {
    this.subs.unsubscribe()
  }

  async onDirectory() {
    if ( !this.directory ) {
      return
    }

    await Promise.all([
      this.tryAddMame(this.directory),
      this.tryAddXinputByTools(this.directory),
      this.tryAddLedBlinkyByTools(this.directory),
    ])

    this.directoriesChange.emit()
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

    this.session.ledBlinky.directory = dir
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
    for (const name of platformNames) {
      const file = await this.session.launchBox.directory?.findFileByPath(`Data/Platforms/${name}.xml`) as DmFileReader

      if ( !file ) {
        continue
      }
      
      // const platformFile = await this.getPlatformFileDetails(name as string, file)
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

    const results = []
    for (const element of namedElements) {
      if ( stopped ) {
        break
      }

      const name = element.textContent
      const file = await this.session.launchBox.directory?.findFileByPath(`Data/Platforms/${name}.xml`) as DmFileReader

      if ( !file ) {
        continue
      }

      const platformFile = await this.getPlatformFileDetails(name as string, file)
      const result = await each(platformFile, {stop})
      results.push(result)
    }

    return results.filter(x => x) as EachResult[]
  }

  async getPlatformFileDetails(
    name: string,
    file: DmFileReader
  ): Promise<PlatformInsights> {
    const xml = await file.readAsXml()

    const gameElements = new Array(...xml.getElementsByTagName('Game') as any) as Element[]
    const [ games, additionalApps ] = [
      gameElements.map(element => {
        const gameInsights: GameInsight = {
          element,
          details: elementToGameDetails(element),
        }
        return gameInsights
      }),
      new Array(...xml.getElementsByTagName('AdditionalApplication') as any) as Element[]
    ]

    return { xml, name, file, games, additionalApps }
  }

  async loadData(fileName: string): Promise<DmFileReader | undefined> {
    const filePath = 'Data/' + fileName
    const platformFile = await this.directory?.findFileByPath(filePath)
    
    if ( !platformFile ) {
      this.session.error(`Launchbox Data file not found ${filePath}`)
      return
    }
    return platformFile
  }

  filterAdditionalAppsByGame(additionalApps: Element[], game: GameDetails) {
    const gameId = game.id
    return additionalApps.filter(app => {
      const elms = app.getElementsByTagName('GameID')
      if ( !elms.length ) {
        return
      }
      return elms[0].textContent === gameId
    })
  }

  filterGamesByAppElement(games: GameInsight[], app: Element) {
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

  mapAdditionalApp(element: Element): AdditionalApp {
    const {child: applicationPathElement, text: applicationPath} = getChildElementAndText(element, 'ApplicationPath')
    const {child: commandLineElement, text: commandLine} = getChildElementAndText(element, 'CommandLine')
    const {child: autoRunAfterElement, text: autoRunAfter} = getChildElementAndText(element, 'AutoRunAfter')
    const {child: autoRunBeforeElement, text: autoRunBefore} = getChildElementAndText(element, 'AutoRunBefore')
    const {child: nameElement, text: name} = getChildElementAndText(element, 'Name')
    
    return {
      element,
      type: getTypeByAddApp(applicationPath),
      commandLineElement, commandLine,
      applicationPath, applicationPathElement,
      autoRunAfter, autoRunAfterElement,
      autoRunBefore, autoRunBeforeElement,
      name, nameElement,
    }
  }

  removeXinputFromApps(apps: AdditionalApp[]) {
    apps.map((app, index) => ({app, index}))
      .filter(app => [AdditionalAppType.XINPUT, AdditionalAppType.XINPUT_KILL].includes(app.app.type))
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

function getChildElementAndText(element: Element, tagName: string) {
  const child = element.getElementsByTagName(tagName)[0]
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