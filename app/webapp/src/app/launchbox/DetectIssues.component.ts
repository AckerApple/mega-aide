import { Component, ComponentFactoryResolver, ɵɵsetComponentScope } from '@angular/core'
import { Router } from '@angular/router'
import { DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { Subscription } from 'rxjs'
import { SessionProvider, WriteFile } from '../session.provider'
import { XArcadeXInputProvider } from '../XArcadeXInput.provider'
import { xmlDocToString } from '../xml.functions'

@Component({
  templateUrl: './DetectIssues.component.html',
})
export class DetectIssuesComponent {
  xarcade = new XArcadeXInputProvider()
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
    public router: Router,
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
    if ( !this.session.launchBoxDirectory ) {
      this.router.navigateByUrl('/launchbox')
    }

    if ( this.session.launchBoxXarcadeDir ) {
      this.xarcade.directory = this.session.launchBoxXarcadeDir
      this.xarcade.loadMappings()
    }
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  async scanXarcade() {
    ++this.scanning
    const filePath = 'Data/Platforms.xml'
    const platformFile = await this.session.launchBoxDirectory?.findFileByPath(filePath)
    --this.scanning
    
    if ( !platformFile ) {
      this.session.error(`platform file not found ${filePath}`)
      return
    }
    
    this.stats.mapCounts = {}
    this.stats.hasDefaultMix = false
    await this.populatePlatformGamesApps(platformFile)
    
    /*const mappings: string[] = []
    this.platformGames.forEach(platform => {
      platform.xArcadeApps.commands.forEach(command => {
        if ( command.mapping ) {
          mappings.push(command.mapping)
        }
      })
    })*/

    // this.searchBy('')
  }
  
  async populatePlatformGamesApps(platformFile: DmFileReader): Promise<(PlatformGameApp | undefined)[]> {
    this.platformGames.length = 0
    this.searchPlatformGames = this.platformGames

    ++this.scanning
    const namedElements = await platformFile.readXmlElementsByTagName('Name')
    --this.scanning

    const platformNames = namedElements.map(name => name.textContent )
      // .filter(name => name === 'PC Games')

    return await Promise.all(platformNames.map(async name => {
      ++this.scanning
      const file = await this.session.launchBoxDirectory?.findFileByPath(`Data/Platforms/${name}.xml`) as DmFileReader
      --this.scanning

      if ( !file ) {
        return
      }

      ++this.scanning
      const result = await this.readPlatformFile(({
        name: name as string,
        file
      }))
      --this.scanning

      return result
    }))
  }

  async readPlatformFile(
    platform: PlatformFile
  ): Promise<PlatformGameApp | undefined> {
    const xml = await platform.file.readAsXml()

    const [ games, additionalApps ] = [
      new Array(...xml.getElementsByTagName('Game') as any) as Element[],
      new Array(...xml.getElementsByTagName('AdditionalApplication') as any) as Element[]
    ]
    
    const platformMap: PlatformGameApp = {
      xmlDoc: xml,
      name: platform.name as string,
      file: platform.file as DmFileReader,
      games,
      additionalApps,
      xArcadeApps: {
        mapped: [], unmapped: [],
        commands: []
      }
    }

    const result = await this.readPlatformMap(platformMap)

    
    if( platformMap.xArcadeApps.commands.length) {
      this.platformGames.push(platformMap)
    }

    return result
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

  readPlatformMap(platformMap: PlatformGameApp) {
    // it doesn't even have additional apps so no xinput here
    if ( !platformMap.additionalApps ) {
      return
    }

    // reset things we are about to calculate
    platformMap.xArcadeApps.mapped.length = 0
    platformMap.xArcadeApps.unmapped.length = 0

    platformMap.additionalApps.forEach((app: Element) => {
      const path = app.getElementsByTagName('ApplicationPath')
        
      if ( !path.length ) {
        return
      }

      const pathString = path[0].textContent as string
      if ( !pathString.includes('XArcade XInput.exe') ) {
        return
      }

      const gameId = app.getElementsByTagName('GameID')[0].textContent
      const gameMatches = platformMap.games.filter(game => game.getElementsByTagName('ID')[0].textContent === gameId)

      if ( !gameMatches?.length ) {
        return
      }
      
      gameMatches.forEach(game => this.registerGameWithPlatformByApp(game, platformMap, app))
    })

    return platformMap
  }

  registerGameWithPlatformByApp(
    game: Element,
    platformMap: PlatformGameApp,
    app: Element,
  ) {
    const gameTitle = game.getElementsByTagName('Title')[0].textContent

    const commandElement = app.getElementsByTagName('CommandLine')[0]
    const commandLine = commandElement.textContent || ''
    const mapping = getCommandMapping(commandLine)
    const gameDetails = {title: gameTitle as string}
    const gameCommandDetails: XArcadeAppCommand = {
      appElement: app, gameDetails,
      commandLine: commandLine,
    }

    if ( mapping ) {
      gameCommandDetails.mapping = mapping
      platformMap.xArcadeApps.mapped.push({
        details: gameDetails,
        element: game,
        mapping: gameCommandDetails.mapping,
        commandElement,
        command: commandLine
      })
      
      // add to total counts
      this.stats.mapCounts[ gameCommandDetails.mapping ] = this.stats.mapCounts[ gameCommandDetails.mapping ] || 0
      ++this.stats.mapCounts[ gameCommandDetails.mapping ]

      if ( platformMap.xArcadeApps.mapped.length && platformMap.xArcadeApps.unmapped.length  ) {
        this.stats.hasDefaultMix = true // detected issue of no default specified where some are mapped
      }    
    } else {
      platformMap.xArcadeApps.unmapped.push({
        element: game,
        details: gameDetails,
        commandElement,
        mapping: '',
        command: commandLine
      })
    }

    platformMap.xArcadeApps.commands.push(gameCommandDetails)
  }

  applyGameCommandMapping(gameCommandMap: GameCommandMap) {
    const command = gameCommandMap.commandElement.textContent as string
    const newCommand = setCommandMapping(command, gameCommandMap.mapping)
    
    gameCommandMap.commandElement.textContent = newCommand
    gameCommandMap.command = newCommand
  }

  updateGameCommandMapping(
    gameCommandMap: GameCommandMap,
    platform: PlatformGameApp
  ) {
    this.applyGameCommandMapping(gameCommandMap)
    this.readPlatformMaps(this.platformGames)
    this.platformChanged(platform)
  }

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
      this.applyGameCommandMapping(x)
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
        string: xmlDocToString(platform.xmlDoc),
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
  mapping?: string
  gameDetails: GameDetails
  appElement: Element
  commandLine: string
}

interface PlatformFile {
  name: string
  file: DmFileReader
}

class GameDetails {
  title!: string
}

interface PlatformGameApp extends PlatformFile {
  xmlDoc: Document
  games: Element[]
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
  command: string
  mapping: string
  element: Element
  commandElement: Element // <CommandLine>
}

function getCommandArgs(command: string): string[] {
  return command.match(/("[^"]+"|[^\s"]+)/gmi) || []
}

function getCommandMapping(command: string): string {
  const args = getCommandArgs(command)
  const mapIndex = args?.findIndex(item => item.includes('--mapping')) as number
  if ( mapIndex < 0 || mapIndex >= args.length-1 ) {
    return ''
  }

  return args[ mapIndex + 1 ].replace(/"/g, '')
}

function setCommandMapping(command: string, mapping: string) {
  const args = getCommandArgs(command)
  const mapIndex = args?.findIndex(item => item.includes('--mapping')) as number
  if ( mapIndex < 0 || mapIndex >= args.length-1 ) {
    return command + ' --mapping ' + commandSafeArg(mapping)
  }

  args[ mapIndex + 1 ] = commandSafeArg(mapping)

  return args.join(' ')
}

function commandSafeArg(commandArg: string): string {
  if ( !commandArg.includes(' ') ) {
    return commandArg
  }

  return '"' + commandArg + '"'
}