import { Component } from '@angular/core'
import { Prompts } from 'ack-angular'
import { animations } from 'ack-angular-fx'
import {  firstValueFrom, Subscription } from 'rxjs'
import { AdditionalApp, AdditionalAppDetails, AdditionalAppType, GameInsight, PlatformInsights, SessionProvider } from '../session.provider'
import { xmlDocToString } from '../xml.functions'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap as ledBlinkRouteMap } from '../ledblinky.routing.module'
import { getElementsByTagName } from '../ledblinky/LedBlinky.utils'
import { xArcade } from '../app.routing.module'
import { addXInputToGame } from './games.utils'

interface GamePlatform {
  game: GameInsight
  platform: PlatformInsights
}

interface SelectedGame {
  game: GamePlatform
  additionalApps: AdditionalApp[]
  hasXinput: boolean
  
  xmlString?: string
  gameView?: any // what to view about a game (xml, form)
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

  platformNames: string[] = []
  
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

    this.loadPlatforms()
    
    const searchRoms = await this.attemptSearchRom()
    if ( searchRoms?.length ) {
      if ( !this.selected && searchRoms.length === 1 ) {
        const rom = searchRoms[0]
        this.platformName = rom.platform.name
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

  async loadPlatforms() {
    this.platformNames = await this.session.launchBox.getPlatformNames()
    return this.platformNames
  }

  viewSelectedGameXml() {
    if ( !this.selected ) {
      return
    }

    this.selected.gameView = 'xml'
    const doc = this.selected.game.game.element
    this.selected.xmlString = xmlDocToString(doc)
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
    this.lastSearch = text
    ++this.searching
    this.searchGames.length = 0

    const search = text.toLowerCase().replace(/_/g, ' ')
    const isNameMatch = (name: string) => name.toLowerCase().replace(/_/g, ' ').includes(search)
    let filter = (game: GameInsight, _platform: PlatformInsights) => isNameMatch(game.details.title)
    
    if ( romNameMode ) {
      filter = (
        game: GameInsight,
        platform: PlatformInsights
      ) => {
        const appPathSplit = game.details.applicationPath.split(/(\/|\\)/)

        // checkplatform
        const platformName = this.platformName
        if ( platformName ) {
          const pathHasPlatformName = appPathSplit.find(x => x.toLowerCase() === platformName.toLowerCase())
          if ( !pathHasPlatformName && !isNameMatch(game.details.title)  ) {
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
    
    await this.session.launchBox.eachPlatform((platform, {stop}) => {
      if ( this.searchGames.length > this.maxGames || myDelay !== this.searchDelay ) {
        stop() // this search is over
      }

      // if we are not in rom mode we can limit platforms
      const platformNameMatched = !romNameMode && this.platformName && platform.name != this.platformName
      if ( platformNameMatched ) {
        return; // skip
      }

      const matchGames = platform.games.filter(x => filter(x, platform)).map(game => ({ game, platform }))
      this.searchGames.push(...matchGames)
    })
    
    --this.searching

    return this.searchGames
  }

  sortSearchPlatform() {
    this.searchGames.sort(({platform: platformA}, {platform: platformB})=>String(platformA.name||'').toLowerCase()>String(platformB.name||'').toLowerCase()?1:-1)
  }

  sortSearchGame() {
    this.searchGames.sort(({game: gameA}, {game: gameB})=>String(gameA.details.title||'').toLowerCase()>String(gameB.details.title||'').toLowerCase()?1:-1)
  }

  async showGame(game: GamePlatform) {
    const apps = await firstValueFrom(game.platform.additionalApps$)
    const additionalApps = this.session.launchBox.filterAdditionalAppsByGame(
      apps,
      game.game.details,
    )
      // .map(app => this.session.launchBox.mapAdditionalApp(app))

    this.selected = {
      game,
      hasXinput: additionalApps.find(app => app.details.type === AdditionalAppType.XINPUT) ? true : false,
      additionalApps
    }

    // just update url params
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        // gameId: game.game.details.id,
        title: game.game.details.title,
        platform: game.platform.name,
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

  addXinputIntoSelected() {
    const selected = this.selected as SelectedGame
    if ( !selected ) {
      return
    }
    
    const xarcadePath = this.session.launchBox.xarcadeDir?.path as string
    if ( !xarcadePath ) {
      this.session.error('Cannot determine xarcade path')
    }  
    
    const apps = addXInputToGame(
      selected.game.game,
      selected.game.platform,
      xarcadePath,
    )
    
    selected.additionalApps.push( ...apps )
    selected.hasXinput = true
    this.saveSelectedGame()

    
    this.addGameToSave(selected.game)
  }

  removeXinputFromSelected() {
    const selected = this.selected
    if ( !selected ) {
      return
    }
    
    this.session.launchBox.removeXinputFromApps(selected.additionalApps)
    selected.hasXinput = false
    this.addGameToSave(selected.game)
  }

  saveFiles() {
    this.session.toSaveFiles = this.toSaveFiles.map(x => ({
      file: x.platform.file,
      string: xmlDocToString(x.platform.xml)
    }))
  }
}
