import { Component } from '@angular/core'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { animations } from 'ack-angular-fx'
import { Subscription } from 'rxjs'
import { AdditionalApp, GameDetails, PlatformInsights, SessionProvider, WriteFile } from '../session.provider'
import { XArcadeXInputProvider } from '../xarcade-xinput/XArcadeXInput.provider'
import { xmlDocToString } from '../xml.functions'
import { applyGameCommandMapping, getCommandMapping } from '../xarcade-xinput/xinput-app-map-select.component'
import { elementToGameDetails } from './LaunchBox.class'

@Component({
  templateUrl: './DetectIssues.component.html',
  animations,
})
export class DetectIssuesComponent {
  scanning = 0
  
  platformGames: PlatformGameApp[] = [] // platforms with games that have mappings
  searchPlatformGames: PlatformGameApp[] = [] // platforms with games that have mappings
  
  stats: {
    hasDefaultMix?: boolean
    mapCounts: { [name: string]: number }
    mostUsed?: { name: string, count: number }
  } = {
    mapCounts: {}
  }
  
  // files changed and saved
  changedPlatformGames: PlatformGameApp[] = [] // platforms with games that have been live edited
  savingFiles?: WriteFile[]
  
  subs = new Subscription()
  
  constructor(
    public session: SessionProvider,
    public xarcade: XArcadeXInputProvider,
    ) {
    // how to react to our files being saved
    this.subs.add(
      this.session.$filesSaved.subscribe(saved => {
        if ( saved === this.savingFiles ) {
          this.savingFiles.length = 0
          this.changedPlatformGames.length = 0
        }
      })
    )
  }

  ngOnInit(){
    this.loadXInputMappings()
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  loadXInputMappings() {
    if ( !this.session.launchBox.xarcadeDir ) {
      return
    }

    this.xarcade.directory = this.session.launchBox.xarcadeDir
    this.xarcade.loadMappings()
  }

  /** Scan launchbox platforms looking for games with additional apps containing xarcade references */
  async scanXarcade() {   
    this.stats.mapCounts = {}
    this.stats.hasDefaultMix = false
    this.platformGames.length = 0
    this.searchPlatformGames = this.platformGames

    ++this.scanning
    await this.session.launchBox.eachPlatform(async (platformFile) => {
      ++this.scanning
      const result = await this.readPlatformFile(platformFile)
      --this.scanning
      if ( result ) {
        this.platformGames.push(result)
      }
    })
    --this.scanning
  }

  async readPlatformFile(
    {xml, name, file, games, additionalApps}: PlatformInsights
  ): Promise<PlatformGameApp | undefined> {    
    const platformMap: PlatformGameApp = {
      xml, name, file,
      games,
      additionalApps,
      xArcadeApps: {
        mapped: [], unmapped: [],
        commands: []
      }
    }

    // populate platformMap apps
    await this.readPlatformMap(platformMap)

    if( platformMap.xArcadeApps.commands.length) {
      return platformMap
    }

    return // not wanted
  }

  /** read a platforms additional apps looking for xarcade */
  readPlatformMap(platformMap: PlatformGameApp) {
    // it doesn't even have additional apps so no xinput here
    if ( !platformMap.additionalApps ) {
      return
    }

    // reset things we are about to calculate
    platformMap.xArcadeApps.mapped.length = 0
    platformMap.xArcadeApps.unmapped.length = 0

    platformMap.additionalApps.forEach((app: Element) => {
      const isXinput = isAddAppElemXinput(app)

      if ( !isXinput ) {
        return
      }

      
      const gameMatches = this.session.launchBox.filterGamesByAppElement(platformMap.games, app)
      if ( !gameMatches?.length ) {
        return
      }
      
      gameMatches.forEach(game => this.registerGameWithPlatformByApp(game.element, platformMap, app))
    })

    return platformMap
  }

  readPlatformMaps(platformGames: PlatformGameApp[]) {
    // reset things that will be recalculated
    this.stats.hasDefaultMix = false
    
    platformGames.forEach(x => this.readPlatformMap(x))
    
    // after calculation
    this.recalculateMapCounts()
  }

  recalculateMapCounts() {
    this.stats.mapCounts = {}
    
    this.searchPlatformGames.forEach(platform => {
      platform.xArcadeApps.unmapped.forEach(gameMap => {
        this.stats.mapCounts[ gameMap.mapping ] = this.stats.mapCounts[ gameMap.mapping ] || 0
        ++this.stats.mapCounts[ gameMap.mapping ]
      })

      platform.xArcadeApps.mapped.forEach(gameMap => {
        this.stats.mapCounts[ gameMap.mapping ] = this.stats.mapCounts[ gameMap.mapping ] || 0
        ++this.stats.mapCounts[ gameMap.mapping ]
      })
    })

    // calculate most used
    const mapEntries = Object.entries(this.stats.mapCounts)
    this.stats.mostUsed = (mapEntries || []).reduce((all: any, [name, count]: [string, number])=> {
      if ( !all || all.count < count ) {
        return { name, count } as any// use current
      }

      return all
    }) as any
  }

  countByMapping(
    mapping: string, // .json file name
    platformMap: PlatformGameApp,
    previousValue?: string,
  ) {
    // add to total counts
    this.stats.mapCounts[ mapping ] = this.stats.mapCounts[ mapping ] || 0
    ++this.stats.mapCounts[ mapping ]

    if ( previousValue ) {
      this.stats.mapCounts[ previousValue ] = this.stats.mapCounts[ previousValue ] || 0
      --this.stats.mapCounts[ previousValue ]  
    }

    if ( platformMap.xArcadeApps.mapped.length && platformMap.xArcadeApps.unmapped.length  ) {
      this.stats.hasDefaultMix = true // detected issue of no default specified where some are mapped
    }
  }

  registerGameWithPlatformByApp(
    game: Element,
    platformMap: PlatformGameApp,
    app: Element,
  ) {
    const appDetails: AdditionalApp = this.session.launchBox.mapAdditionalApp(app)
    const mapping = getCommandMapping(appDetails.commandLine)
    const gameDetails: GameDetails = elementToGameDetails(game)
    
    const gameCommandDetails: XArcadeAppCommand = {
      app: appDetails,
      appElement: app,
      gameDetails,
      commandLine: appDetails.commandLine,
    }

    this.regMapXarcade(
      mapping,
      game,
      gameCommandDetails,
      platformMap,
    )

    platformMap.xArcadeApps.commands.push(gameCommandDetails)
  }

  regMapXarcade(
    mapping: string,
    game: Element,
    gameCommandDetails: XArcadeAppCommand,
    platformMap: PlatformGameApp,
  ) {
    gameCommandDetails.mapping = mapping
    this.regMapXarcade2(
      mapping,
      game,
      platformMap,
      gameCommandDetails.gameDetails,
      gameCommandDetails.app,
    )
  }

  regMapXarcade2(
    mapping: string,
    game: Element,
    platformMap: PlatformGameApp,
    gameDetails: GameDetails,
    appDetails: AdditionalApp
  ) {
    if ( mapping ) {
      platformMap.xArcadeApps.mapped.push({
        details: gameDetails,
        element: game,
        mapping: mapping,
        appDetails,
      })
      
      this.countByMapping(mapping, platformMap)
      return
    }

    platformMap.xArcadeApps.unmapped.push({
      element: game,
      details: gameDetails,
      mapping: '',
      appDetails,
    })
  }

  updatePlatformGame(
    platform: PlatformGameApp,
    game: GameCommandMap,
    newMapping: string,
    previousMapping: string,
  ) {
    this.platformChanged(platform)

    const mappedIndex = platform.xArcadeApps.mapped.findIndex(x => x === game)
    if ( mappedIndex >= 0 ) {
      platform.xArcadeApps.mapped.splice(mappedIndex,1)
    }

    const unmappedIndex = platform.xArcadeApps.unmapped.findIndex(x => x === game)
    if ( unmappedIndex >= 0 ) {
      platform.xArcadeApps.unmapped.splice(unmappedIndex,1)
    }

    this.regMapXarcade2(
      newMapping,
      game.element,
      platform,
      game.details,
      game.appDetails,
    )
  

    this.recalculateMapCounts()
  }

  /*updatePlatform(
    platform: PlatformGameApp
  ) {
    // this.readPlatformMaps(this.platformGames)
    this.readPlatformMap(platform) // rereads all in platform (poor performance)
    this.platformChanged(platform)
  }*/

  platformChanged(platform: PlatformGameApp) {
    if ( !this.changedPlatformGames.find(x => x === platform) ) {
      this.changedPlatformGames.push(platform)
    }
  }

  changePlatformGameCommandMappings(
    platform: PlatformGameApp,
    maps: GameCommandMap[],
    mapping?: string | null
  ) {
    maps.forEach(x => {
      x.mapping = mapping || ''
      applyGameCommandMapping(x.appDetails, x.mapping)
    })

    this.readPlatformMaps(this.platformGames)
    this.platformChanged(platform)
  }

  changeAllPlatformsTo(mapping:string) {
    this.platformGames.forEach(x => {
      this.changePlatformGameCommandMappings(x, x.xArcadeApps.mapped, mapping)
      this.changePlatformGameCommandMappings(x, x.xArcadeApps.unmapped, mapping)
    })
  }

  saveChangedFiles() {
    this.savingFiles = this.session.toSaveFiles = this.changedPlatformGames.map(platform => {
      return {
        file: platform.file,
        string: xmlDocToString(platform.xml),
      }
    })
  }

  searchBy(text: string) {
    if ( !text ) {
      this.searchPlatformGames = this.platformGames
      this.recalculateMapCounts()
      return
    }

    text = text.toLowerCase()
    this.searchPlatformGames = this.platformGames.map(platform => {
      // shallow clone
      const clone = { ...platform }
      clone.xArcadeApps = { ...clone.xArcadeApps }
      
      const searchFunc = (map: GameCommandMap) => {
        return map.details.title.toLowerCase().includes( text )
      }

      clone.xArcadeApps.mapped = clone.xArcadeApps.mapped.filter(searchFunc)
      clone.xArcadeApps.unmapped = clone.xArcadeApps.unmapped.filter(searchFunc)
      
      return clone
    }).filter(platform => platform.xArcadeApps.mapped.length || platform.xArcadeApps.unmapped.length)
    
    this.recalculateMapCounts()
  }
}

interface XArcadeAppCommand {
  app: AdditionalApp
  mapping?: string
  gameDetails: GameDetails
  appElement: Element // game element?
  commandLine: string
}

interface PlatformGameApp extends PlatformInsights {
  additionalApps: Element[]
  xArcadeApps: {
    commands: XArcadeAppCommand[]
    mapped: GameCommandMap[]
    unmapped: GameCommandMap[]
    viewDetails?: boolean
  }
}

interface GameCommandMap {
  details: GameDetails
  mapping: string
  element: Element
  appDetails: AdditionalApp
}

export function findElementText(game: Element, tagName: string) {
  const elements = game.getElementsByTagName(tagName)
  return elements.length ? elements[0].textContent : ''
}

export function getGameElementTitle(game: Element) {
  return findElementText(game, 'Title')
  // return game.getElementsByTagName('Title')[0].textContent
}

export function getGameElementId(game: Element) {
  return findElementText(game, 'ID')
}

function isAddAppElemXinput(app: Element) {
  const path = app.getElementsByTagName('ApplicationPath')
        
  if ( !path.length ) {
    return false
  }

  const pathString = path[0].textContent as string
  return isPathXinput(pathString)
}

export function isPathXinput(path: string) {
  if ( path.includes('XArcade XInput.exe') ) {
    return true
  }

  return false
}

export function isPathKillXinput(path: string) {
  if ( (path.includes('xarcade') || path.includes('xinput')) && path.includes('kill') ) {
    return true
  }

  return false
}