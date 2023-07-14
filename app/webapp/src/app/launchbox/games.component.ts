import { Component } from '@angular/core'
import { Prompts } from 'ack-angular'
import { animations } from 'ack-angular-fx'
import { firstValueFrom, map, Observable, Subscription } from 'rxjs'
import { AdditionalApp, AdditionalAppType, GameInsight, PlatformInsights, SessionProvider } from '../session.provider'
import { xmlDocToString } from '../xml.functions'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap as ledBlinkRouteMap } from '../ledblinky.routing.module'
import { getElementsByTagName } from '../ledblinky/LedBlinky.utils'
import { addAppToPlatform, addXInputToGame, getNewApp } from './games.utils'

interface GamePlatform {
  game: GameInsight
  platform: PlatformInsights
}

interface SelectedGame {
  game: GamePlatform
  additionalApps$: Observable<AdditionalApp[]>
  hasXinput$: Observable<boolean>
  
  xmlString?: string
  view?: any // what to view about a game (xml, form)
}

@Component({
  templateUrl: './games.component.html',
  animations,
})
export class GamesComponent {
  platformName?: string
  searchGames: GamePlatform[] = []
  toSaveFiles: GamePlatform[] = []
  searchDelay: any
  searching = 0
  searchText: string = ''
  lastSearch: string = ''
  maxGames = 200
  selected?: SelectedGame
  subs = new Subscription()
  platformsRead = 0
  
  ledBlinkRouteMap = ledBlinkRouteMap

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public session: SessionProvider,
    public prompts: Prompts,
  ) {
    // when directory selected, then perform actions
    this.subs.add(
      this.session.launchBox.directoryChange.subscribe(() => 
        this.load()
      )
    )

    // load query variable
    const platformName = this.activatedRoute.snapshot.queryParams['platform']
    if ( platformName ) {
      this.platformName = platformName
    }

    // load query variable
    const searchText = this.activatedRoute.snapshot.queryParams['title'] || this.activatedRoute.snapshot.queryParams['search']
    if ( searchText ) {
      this.searchText = searchText
    }

    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return
    }
    this.load()
  }

  ngOnInit(){
    this.subs.add(
      this.session.$filesSaved.subscribe(() => this.toSaveFiles.length = 0)
    )
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }


  async load() {
    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return
    }
    
    const searchRoms = await this.attemptSearchRom()
    if ( searchRoms?.length ) {
      if ( !this.selected && searchRoms.length === 1 ) {
        const rom = searchRoms[0]
        this.platformName = rom.platform.fileName
        this.showGame( rom )
      }
      return // its loading one rom
    }

    if ( this.searchText ) {
      this.trySearchGames(this.searchText)
    }
  }

  attemptSearchRom() {
    // load query variable
    const searchRom = this.activatedRoute.snapshot.queryParams['rom']
    if ( !searchRom ) {
      return
    }
    
    this.searchText = searchRom
    return this.trySearchGames(searchRom, {romNameMode: true})
  }

  viewSelectedGameXml(selected: SelectedGame) {
    selected.view = 'xml'
    const doc = selected.game.game.element
    selected.xmlString = xmlDocToString(doc)
  }

  async trySearchGames(
    search: string,
    options?: { romNameMode?: boolean }
  ) {
    if ( this.lastSearch === search ) {
      return
    }
    
    return this.performSearch(search, options)
  }

  async performSearch(
    search: string,
    { romNameMode }: { romNameMode?: boolean } = {}
  ): Promise<GamePlatform[] | undefined> {
    clearTimeout(this.searchDelay)

    // just update url params
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        search, platform: this.platformName
      }, 
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    })

    if ( search.length < 3 ) {
      return
    }
    
    return new Promise((res, rej) => {
      const myDelay = this.searchDelay = setTimeout(async () => {        
        try {
          const results = await this.runSearch(search, {romNameMode, myDelay})
          res( results )
        } catch (err: any) {
          this.session.error(err.message, err);
          rej(err)
        }
      }, 500)
    })
  }

  toggleFavorite(gamePlatform: GamePlatform) {
    const game: GameInsight = gamePlatform.game
    game.details.favorite = !game.details.favorite
    
    const favorites = getElementsByTagName(game.element, 'Favorite')
    const favElm = favorites[0] || document.createElement('Favorite')

    if ( !favorites[0] ) {
      game.element.appendChild(favElm) // attach element to game
    }

    favElm.textContent = game.details.favorite ? 'true' : 'false'
    this.addGameToSave(gamePlatform)
  }

  async runSearch(
    text: string,
    { myDelay, romNameMode }: { myDelay: any, romNameMode?: boolean }
  ): Promise<GamePlatform[]> {
    const launchBox = this.session.launchBox
    this.lastSearch = text
    this.searchGames.length = 0

    const search = text.toLowerCase().replace(/_/g, ' ')
    const searchSplit = search.split(' ')

    let filter = platformFilter
    
    if ( romNameMode ) {
      filter = (
        game: GameInsight,
        _platform: PlatformInsights
      ) => {
        const appPathSplit = game.details.applicationPath.split(/(\/|\\)/)

        // checkplatform
        const platformName = this.platformName
        if ( platformName ) {
          const pathHasPlatformName = appPathSplit.find(x => x.toLowerCase() === platformName.toLowerCase())
          if ( !pathHasPlatformName && !isNameMatch(game.details.title, searchSplit)  ) {
            return false // 99% sure its not this platform
          }
        }

        const fileName = appPathSplit.pop() as string
        const fileParts = fileName.split('.')
        fileParts.pop()
        const isFileMatch = fileParts.join('.').toLowerCase() == text
        if ( isFileMatch ) {
          return true
        }

        const isExactTitle = game.details.title.toLowerCase().replace(/_/g, ' ') === search
        return isExactTitle
      }
    }
    
    ++this.searching
    this.platformsRead = 0

    // only one platform?
    if ( this.platformName ) {
      const dir = await firstValueFrom(launchBox.directory$)
      const platform = await launchBox.getPlatformFileByFileName(dir, this.platformName)
      if ( platform ) {
        await this.scanPlatform(platform, filter, searchSplit)
        --this.searching
        return this.searchGames
      }
    }
    
    await this.session.launchBox.eachPlatform(async (platform, {stop}) => {
      if ( this.searchGames.length > this.maxGames || myDelay !== this.searchDelay ) {
        // this.session.warn('search stopped')
        stop() // this search is over
      }

      this.scanPlatform(platform, filter, searchSplit)
      // if we are not in rom mode we can limit platforms
      const platformNameMatched = !romNameMode
      if ( platformNameMatched ) {
        return; // skip
      }
    })
    
    --this.searching

    return this.searchGames
  }

  async scanPlatform(
    platform: PlatformInsights,
    filter: (game: GameInsight, platform: PlatformInsights, searchSplit: string[]) => boolean,
    searchSplit: string[]
  ) {
    ++this.platformsRead

    const games = await firstValueFrom(platform.games$)
    const matchGames = games.filter(x => filter(x, platform, searchSplit)).map(game => ({ game, platform }))
    this.searchGames.push(...matchGames)
  }

  sortSearchPlatform() {
    this.searchGames.sort(({platform: platformA}, {platform: platformB})=>String(platformA.id||'').toLowerCase()>String(platformB.id||'').toLowerCase()?1:-1)
  }

  sortSearchGame() {
    this.searchGames.sort(({game: gameA}, {game: gameB})=>String(gameA.details.title||'').toLowerCase()>String(gameB.details.title||'').toLowerCase()?1:-1)
  }

  async showGame(
    game: GamePlatform
  ) {
    const additionalApps$ = game.platform.additionalApps$.pipe(
      map(apps =>
        this.session.launchBox.filterAdditionalAppsByGame(
          apps,
          game.game.details,
        )
      )
    )

    this.selected = {
      game,
      additionalApps$,
      hasXinput$: additionalApps$.pipe(
        map(apps => apps.find(app => app.details.type === AdditionalAppType.XINPUT) ? true : false),
      )
    }

    // just update url params
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        // gameId: game.game.details.id,
        title: game.game.details.title,
        platform: game.platform.fileName,
      }, 
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    })
  }

  saveSelectedGame() {
    if ( !this.selected ) {
      return
    }
    this.addGameToSave(this.selected.game)
  }

  addGameToSave(game: GamePlatform) {
    if ( !this.toSaveFiles.find(x => game === x) ) {
      this.toSaveFiles.push(game)
    }    
  }

  addAppInto(
    additionalApps: AdditionalApp[]
  ) {
    const selected = this.selected as SelectedGame
    if ( !selected ) {
      return
    }

    const gameId = selected.game.game.details.id
    const app = getNewApp({ gameId })
    const platform = selected.game.platform
    addAppToPlatform(app, platform)
    
    additionalApps.push( app )
    
    this.saveSelectedGame()
    this.addGameToSave(selected.game)
  }

  async addXinputInto(
    additionalApps: AdditionalApp[]
  ) {
    const selected = this.selected as SelectedGame
    if ( !selected ) {
      return
    }
    
    const launchBox = this.session.launchBox
    
    // cause xarcadeDir to be loaded
    const directories = await firstValueFrom(launchBox.directories$)
    
    const xarcadePath = directories.xinput?.path as string
    if ( !xarcadePath ) {
      this.session.error('Cannot determine xarcade path')
    }  
    
    const apps = addXInputToGame(
      selected.game.game,
      selected.game.platform,
      xarcadePath,
    )
    
    additionalApps.push( ...apps )
    this.saveSelectedGame()
    this.addGameToSave(selected.game)
  }

  removeXinputFrom(
    selected: SelectedGame | undefined,
    additionalApps: AdditionalApp[]
  ) {
    if ( !selected ) {
      return
    }
    
    this.session.launchBox.removeXinputFromApps(additionalApps)
    // selected.hasXinput = false
    this.addGameToSave(selected.game)
  }

  saveFiles() {
    this.session.toSaveFiles = this.toSaveFiles.map(x => ({
      file: x.platform.file,
      string: xmlDocToString(x.platform.xml)
    }))
  }
}

function isNameMatch(
  name: string,
  searchSplit: string[],
) {
  const compare = name.toLowerCase().replace(/_/g, ' ')
  return searchSplit.every(search => compare.includes(search))
}


function platformFilter(
  game: GameInsight,
  _platform: PlatformInsights,
  searchSplit: string[],
) {
  return isNameMatch(game.details.title, searchSplit)
}