import { LaunchBox } from '../LaunchBox.class'
import { getCommandMapByAdditionalApp, getCommandMapping } from '../../xarcade-xinput/xinput-app-map-select.component'
import { AdditionalApp, GameInsight, PlatformInsights, XInputGameInsight } from 'src/app/session.utils'
import { GameCommandMap } from '../xinput-games-table.component'
import { addXInputToGame } from '../games.utils'
import { firstValueFrom } from 'rxjs'
import { isPathXinput } from './xinput.utils'

export interface MapStats {
  hasDefaultMix?: boolean
  mapCounts: { [name: string]: number }
  mostUsed?: { name: string, count: number }
}

export async function readPlatformFile(
  platform: PlatformInsights,
  launchBox: LaunchBox,
  stats: MapStats,
): Promise<PlatformGameApp> {
  const platformMap: PlatformGameApp = {
    ...platform,
    xArcadeApps: {
      mapped: [],
      unmapped: [],
      commands: []
    }
  }

  // populate platformMap apps
  await readPlatformMap(platformMap, launchBox, stats)

  return platformMap
}


export interface PlatformGameApp extends PlatformInsights {
  xArcadeApps: {
    commands: XArcadeAppCommand[]
    // mapped: GameCommandMap[]
    // unmapped: GameCommandMap[]
    mapped: GameInsight[]
    unmapped: GameInsight[]
    viewDetails?: boolean
  }
}

export interface XArcadeAppCommand {
  app: AdditionalApp
  game: GameInsight
  commandLine: string
  
  mapping?: string
}

export function isAddAppXinput(app: AdditionalApp) {
  const pathString = app.details.applicationPath || ''
  return isPathXinput(pathString)
}

/** read a platforms additional apps looking for xarcade */
export async function readPlatformMap(
  platformMap: PlatformGameApp,
  launchBox: LaunchBox,
  stats: MapStats,
): Promise<PlatformGameApp | undefined> {
  const additionalApps = await firstValueFrom(platformMap.additionalApps$)
  
  // reset things we are about to calculate
  platformMap.xArcadeApps.mapped.length = 0
  platformMap.xArcadeApps.unmapped.length = 0
  
  additionalApps.forEach(async app => {    
    const games = await firstValueFrom(platformMap.games$)
    const gameMatches = launchBox.filterGamesByAppElement(
      games,
      app.element
    )

    if ( !gameMatches?.length ) {
      // no app matches this game
      return
    }
    
    gameMatches.forEach(game => registerGameWithPlatformByApp(
      game,
      platformMap,
      app,
      stats
    ))
  })

  return platformMap
}

function registerGameWithPlatformByApp(
  game: GameInsight,
  platformMap: PlatformGameApp,
  app: AdditionalApp,
  stats: MapStats,
): void {
  const commandLine = app.details.commandLine || ''
  const mapping = getCommandMapping(commandLine)

  game.additionalApps = game.additionalApps || []
  game.additionalApps.push(app)
  
  const gameCommandDetails: XArcadeAppCommand = getGameCommandDetails(game, app)
  gameCommandDetails.mapping = mapping
  regMapXarcade(
    game,
    gameCommandDetails,
  )

  if ( isAddAppXinput(app) ) {
    if ( mapping ) {
      platformMap.xArcadeApps.mapped.push(game)
      countByMapping(mapping, platformMap, stats)
    } else {
      platformMap.xArcadeApps.unmapped.push(game)
    }
  
    platformMap.xArcadeApps.commands.push(gameCommandDetails)
  }
}

export function getGameCommandDetails(
  game: GameInsight,
  app: AdditionalApp,
): XArcadeAppCommand {
  return {
    app, game, commandLine: app.details.commandLine || '',
  }
}

function regMapXarcade(
  game: GameInsight,
  gameCommandDetails: XArcadeAppCommand,
): GameCommandMap {
  const result = regMapXarcadeOnto(
    game,
    gameCommandDetails.app,
  )

  return result
}

export function regMapXarcadeOnto(
  game: GameInsight,
  app: AdditionalApp,
): GameCommandMap {
  // const command = getGameCommandDetails(game, app) // command already on app.details.commandLine
  const mapping = getCommandMapByAdditionalApp(app)
  const gameCommand: GameCommandMap = {
    mapping, game, app,
  }

  const isXinput = isAddAppXinput(app)
  if ( isXinput ) {
    game.xInput = {
      app,
      mapping: getCommandMapByAdditionalApp(app)
    }
  }

  return gameCommand
}

export function countByMapping(
  mapping: string, // .json file name
  platformMap: PlatformGameApp,
  stats: MapStats,
  previousValue?: string,
) {
  // add to total counts
  stats.mapCounts[ mapping ] = stats.mapCounts[ mapping ] || 0
  ++stats.mapCounts[ mapping ]

  if ( previousValue ) {
    stats.mapCounts[ previousValue ] = stats.mapCounts[ previousValue ] || 0
    --stats.mapCounts[ previousValue ]  
  }

  if ( platformMap.xArcadeApps.mapped.length && platformMap.xArcadeApps.unmapped.length  ) {
    stats.hasDefaultMix = true // detected issue of no default specified where some are mapped
  }
}

function recalculatePlatform(
  platform: PlatformGameApp,
  stats: MapStats,
) {
  platform.xArcadeApps.unmapped.forEach(gameMap => {
    const mapping = gameMap.xInput ? gameMap.xInput.mapping : '' // gameMap.mapping
    stats.mapCounts[ mapping ] = stats.mapCounts[ mapping ] || 0
    ++stats.mapCounts[ mapping ]
  })

  platform.xArcadeApps.mapped.forEach(gameMap => {
    const mapping = (gameMap.xInput as XInputGameInsight).mapping // gameMap.mapping
    stats.mapCounts[ mapping ] = stats.mapCounts[ mapping ] || 0
    ++stats.mapCounts[ mapping ]
  })
}

export function recalculateMapCounts(
  stats: MapStats,
  platformGames: PlatformGameApp[]
): void {
  stats.mapCounts = {}
  
  platformGames.forEach(platform => recalculatePlatform(platform, stats))

  // calculate most used
  const mapEntries = Object.entries(stats.mapCounts)
  stats.mostUsed = (mapEntries || []).reduce((all: any, [name, count]: [string, number])=> {
    if ( !all || all.count < count ) {
      return { name, count } as any// use current
    }

    return all
  }, { count: 0 })
}

export function updatePlatformByGame(
  platform: PlatformGameApp,
  game: GameInsight,
  stats: MapStats,
  xarcadePath: string,
) {
  // remove from where it may have been mapped (we will remap below)
  const mappedIndex = platform.xArcadeApps.mapped.findIndex(x => x === game)
  if ( mappedIndex >= 0 ) {
    platform.xArcadeApps.mapped.splice(mappedIndex,1)
  }

  // remove from where it may have been unmapped (we will remap below)
  const unmappedIndex = platform.xArcadeApps.unmapped.findIndex(x => x === game)
  if ( unmappedIndex >= 0 ) {
    platform.xArcadeApps.unmapped.splice(unmappedIndex,1)
  }

  const xInput = game.xInput
  if ( !xInput ) {
    addXInputToGame(
      game,
      platform,
      xarcadePath,
    )
  }

  if ( xInput ) {
    const mapping = xInput?.mapping
    const gameCommandDetails: XArcadeAppCommand = getGameCommandDetails(game, xInput.app)
    gameCommandDetails.mapping = mapping

    // lets remap
    if ( mapping ) {
      platform.xArcadeApps.mapped.push(game)
      countByMapping(mapping, platform, stats)
    } else {
      platform.xArcadeApps.unmapped.push(game)
    }
  }

  // recalculateMapCounts(stats, platformGames)
  recalculatePlatform(platform, stats)
}
