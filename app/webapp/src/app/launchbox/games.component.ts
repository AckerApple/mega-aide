import { Component } from '@angular/core'
import { Prompts } from 'ack-angular'
import { animations } from 'ack-angular-fx'
import { firstValueFrom, Subscription } from 'rxjs'
import { removeAppFromApps } from './LaunchBox.class'
import { AdditionalApp, AdditionalAppType, GameInsight, PlatformInsights, SessionProvider } from '../session.provider'
import { xmlDocToString } from '../xml.functions'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap as ledBlinkRouteMap } from '../ledblinky.routing.module'
import { getElementsByTagName } from '../ledblinky/LedBlinky.utils'

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

  showGame(game: GamePlatform) {
    const additionalApps = this.session.launchBox.filterAdditionalAppsByGame(game.platform.additionalApps, game.game.details)
      .map(app => this.session.launchBox.mapAdditionalApp(app))

    this.selected = {
      game,
      hasXinput: additionalApps.find(app => app.type === AdditionalAppType.XINPUT) ? true : false,
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

  addXinputKillIntoSelected() {
    const selected = this.selected as SelectedGame
    if ( !selected ) {
      return
    }
    const platformXml = selected.game.platform.xml
    const firstElm = platformXml.getElementsByTagName('LaunchBox')[0]
    const killXinputApp = this.newKillXinputApp(selected.game.game.details.id)
    firstElm.appendChild(killXinputApp.element)
    selected.additionalApps.push(killXinputApp)
    selected.hasXinput = true
    this.saveSelectedGame()
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
    
    const xinputApp = this.newXinputApp(selected.game.game.details.id)

    const platformXml = selected.game.platform.xml
    const firstElm = platformXml.getElementsByTagName('LaunchBox')[0]
    firstElm.appendChild(xinputApp.element)
    
    selected.additionalApps.push(xinputApp)
    selected.hasXinput = true
    this.addGameToSave(selected.game)
    this.addXinputKillIntoSelected()
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

  newKillXinputApp(gameId: string): AdditionalApp {
    const xarcadePath = this.session.launchBox.xarcadeDir?.path as string
    
    if ( !xarcadePath ) {
      this.session.error('Cannot determine xarcade path')
    }

    return this.getNewApp({
      gameId,
      applicationPath: xarcadePath + '/xarcade-xinput/kill xinput.exe',
      name: 'kill xinput',
      type: AdditionalAppType.XINPUT_KILL,
      commandLine: '',
      autoRunAfter: 'true',
      autoRunBefore: 'false'
    })
  }

  newXinputApp(gameId: string): AdditionalApp {    
    const xarcadePath = this.session.launchBox.xarcadeDir?.path as string
    
    if ( !xarcadePath ) {
      this.session.error('Cannot determine xarcade path')
    }

    return this.getNewApp({
      gameId,
      applicationPath: xarcadePath+'/xarcade-xinput/XArcade XInput.exe',
      name: 'xinput',
      type: AdditionalAppType.XINPUT,
      commandLine: '--skip-ui',
      autoRunAfter: 'false',
      autoRunBefore: 'true'
    })
  }

  async removeAppFromApps(app: AdditionalApp, apps: AdditionalApp[]) {
    const confirm = await firstValueFrom(
      this.prompts.confirm('remove additional app')
    )

    if ( confirm ) {
      removeAppFromApps(app, apps)
    }
  }

  getNewApp({
    applicationPath, name, type,
    commandLine, gameId,
    autoRunAfter, autoRunBefore,
  }: {
    applicationPath: string
    name: string
    gameId: string
    commandLine: string
    autoRunAfter: string
    autoRunBefore: string
    type: AdditionalAppType
  }): AdditionalApp {
    const newApp = createElement('AdditionalApplication')
   
    /** Things possibly missing:
      <GogAppId/>
      <OriginAppId/>
      <OriginInstallPath/>
      <UseDosBox>false</UseDosBox>
      <UseEmulator>false</UseEmulator>
      <Developer/>
      <Publisher/>
      <Region/>
      <Version/>
      <Status/>
      <EmulatorId/>
      <SideA>false</SideA>
      <SideB>false</SideB>
      <Priority>0</Priority>
    */
    newTextElementOn('ID', uuidv4(), newApp)
    newTextElementOn('GameID', gameId, newApp)
    newTextElementOn('PlayCount', '0', newApp)
    newTextElementOn('PlayTime', '0', newApp)
    newTextElementOn('WaitForExit', 'false', newApp)
    const {element: applicationPathElement} = newTextElementOn('ApplicationPath', applicationPath, newApp)
    const {element: nameElement} = newTextElementOn('Name', name, newApp)
    const {element: commandLineElement} = newTextElementOn('CommandLine', commandLine, newApp)
    const {element: autoRunAfterElement} = newTextElementOn('AutoRunAfter', autoRunAfter, newApp)
    const {element: autoRunBeforeElement} = newTextElementOn('AutoRunBefore', autoRunBefore, newApp)
  
    return {
      type,
      element: newApp,
     
      autoRunAfter,
      autoRunAfterElement,
      
      autoRunBefore,
      autoRunBeforeElement,
      
      name,
      nameElement,
    
      applicationPath,
      applicationPathElement,
    
      commandLine,
      commandLineElement,
    }
  }

  saveFiles() {
    this.session.toSaveFiles = this.toSaveFiles.map(x => ({
      file: x.platform.file,
      string: xmlDocToString(x.platform.xml)
    }))
  }

  applyAppCommandLine(app: AdditionalApp) {
    const element = app.element.getElementsByTagName('CommandLine')[0]
    element.textContent = app.commandLine
    this.saveSelectedGame()
  }
  
  applyAppApplicationPath(app: AdditionalApp) {
    const element = app.element.getElementsByTagName('ApplicationPath')[0]
    element.textContent = app.applicationPath
    this.saveSelectedGame()
  }

  toggleAppSkipUi(app: AdditionalApp) {
    const skip = app.commandLine.includes('--skip-ui')

    if ( skip ) {
      return app.commandLine = app.commandLine.replace(/--skip-ui([ ])*/,'')
    }

    return app.commandLine = '--skip-ui ' + app.commandLine
  }
}

function newTextElementOn(type: string, text: string, on: Element) {
  const element = createElement(type)
  element.textContent = text
  on.appendChild(element)
  return { text, element }
}

function createElement(tagName: string): Element {
  const doc = new DOMParser().parseFromString(`<${tagName}></${tagName}>`, 'text/xml')
  return doc.children[0]
}

function uuidv4() {
  const first = [1e7] as any
  const formula = (first+-1e3+-4e3+-8e3+-1e11)
  return formula.replace(/[018]/g, (c: any) =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}