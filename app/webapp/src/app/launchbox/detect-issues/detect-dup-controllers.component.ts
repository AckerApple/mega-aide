import { Component } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { animations } from "ack-angular-fx"
import { combineLatest, BehaviorSubject, firstValueFrom, map, Observable, debounceTime, distinctUntilChanged, delay, shareReplay, Subject, ReplaySubject } from "rxjs"
import { GameInsight, PlatformInsights, SessionProvider } from "src/app/session.provider"
import { xmlDocToString } from "src/app/xml.functions"
import { ControllerSupport } from "../LaunchBox.class"

@Component({
  animations,
  templateUrl: './detect-dup-controllers.component.html',
}) export class DetectDupControllersComponent {
  search$ = new BehaviorSubject( this.activatedRoute.snapshot.queryParams['search'] )
  platformName$ = new BehaviorSubject( this.activatedRoute.snapshot.queryParams['platformName'] )
  reload$ = new ReplaySubject<number>()
  pagesize = 200
  
  // scan status
  platformsRead = 0
  platformRead?: PlatformInsights

  private platforms: PlatformDups[] = [] // used to stop a search in progress
  platforms$: Observable<PlatformDups[]> = combineLatest([
    // this.search$,
    // this.platformName$,
    this.reload$,
    this.session.launchBox.directory$,
  ]).pipe(
    // debounceTime(300),
    map(() => {
      const [search, platformName] = [this.search$.getValue(), this.platformName$.getValue()]
      const platforms: PlatformDups[] = this.platforms = []
      this.platformsRead = 0

      // safe change detection
      setTimeout(() => this.session.load$.next(1), 0)
      
      this.session.launchBox.eachPlatform(async (platform, {stop}) => {
        this.platformRead = platform
        setTimeout(() => this.readPlatform(platform, platforms, search, stop), 0)
        // this.readPlatform(platform, platforms, search, stop)
      }, { platformName })
      .then(platforms => {
        this.session.load$.next(-1)
        return platforms
      })

      // update page query params
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: {
          search, platformName
        }, 
        queryParamsHandling: 'merge', // remove to replace all query params by provided
      })
        
      return platforms
    })
  )

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
    public router: Router,
  ) {}

  async readPlatform(
    platform: PlatformInsights,
    platforms: PlatformDups[],
    search: string,
    stop: () => void,
  ) {
    const unfilteredSupports = await firstValueFrom(platform.controllerSupports$)
    const supportStats = unfilteredSupports.reduce((all, support) => {
      const index = all.findIndex(a =>
        a.support.details.gameId === support.details.gameId &&
        a.support.details.controllerId === support.details.controllerId
      )

      if ( index >= 0 ) {
        all[index].duplicates.push(support)
      } else {
        all.push({
          support, duplicates: []
        })
      }

      return all
    }, [] as SupportDuplicate[])

    const controlSupports = supportStats.filter(x => x.duplicates.length > 1)
    ++this.platformsRead

    if ( !controlSupports.length ) {
      return // no duplicates here
    }

    const platformDups: PlatformDups = {
      platform, gamesWithDups: [], page: 1
    }

    search = search ? search.toLowerCase() : ''
    const searchSplit = search.split(' ')
    for (const setup of controlSupports) {
      const { support, duplicates } = setup
      if ( platforms !== this.platforms ) {
        stop() // we detected a new search
        break
      }

      const gameId = support.details.gameId
      if ( search ) {
        const game = await platform.getGameById( gameId ) as GameInsight

        if ( !game ) {
          console.warn('should not get here. A <ControllerSupport> has no matching game')
          continue
        }

        const lowerTitle = game.details.title.toLowerCase()
        if ( !searchSplit.every(search => lowerTitle.includes(search)) ) {
          continue // not a search match
        }
      }

      const game$ = new Observable<GameInsight | undefined>(sub => {
        platform.getGameById( gameId )
          .then(game => {
            if ( !game ) {
              console.warn('should not get here. A <ControllerSupport> has no matching game')
              sub.next( undefined )
              return
            }

            sub.next( game )
          })
      }).pipe(
        shareReplay(1)
      )

      platformDups.gamesWithDups.push({
        gameId: support.details.gameId,
        game$,
        controllers: [{
          control: support, 
          duplicates,
        }],
      })
    }

    platformDups.gamesWithDups = platformDups.gamesWithDups.filter(item => {
      item.controllers = item.controllers.filter(control => 
        control.duplicates.length
      )

      return item.controllers.length
    })

    if ( platformDups.gamesWithDups.length ) {
      platforms.push( platformDups )
    }
  }

  fixAllPlatforms(platforms: PlatformDups[]) {
    this.session.load$.next(1)
    
    for (let index = platforms.length - 1; index >= 0; --index) {
      const platform = platforms[index]

      for (let dupIndex = platform.gamesWithDups.length - 1; dupIndex >= 0; --dupIndex) {
        const game = platform.gamesWithDups[dupIndex]
        fixGame(game, platform)
      }

      this.session.addFileToSave({
        file: platform.platform.file,
        string: xmlDocToString(platform.platform.xml),
      })

      platforms.splice(index, 1)
    }

    this.session.load$.next(-1)
  }

  fixGame(
    game: GameWithDups,
    platform: PlatformDups
  ) {
    fixGame(game, platform)

    this.session.addFileToSave({
      file: platform.platform.file,
      string: xmlDocToString(platform.platform.xml),
    })
  }

  fixGameControl(
    game: GameWithDups,
    control: ControllerDup,
    platform: PlatformDups
  ) {
    fixControl(game, control, platform)

    this.session.addFileToSave({
      file: platform.platform.file,
      string: xmlDocToString(platform.platform.xml),
    })
  }
}

interface ControllerDup {
  control: ControllerSupport,
  duplicates: ControllerSupport[]
}

interface GameWithDups {
  gameId: string
  game$: Observable<GameInsight | undefined>
  controllers: ControllerDup[]
  
  // ui controls
  show?: boolean
}

interface PlatformDups {
  platform: PlatformInsights
  gamesWithDups: GameWithDups[]
  
  // ui controls
  showGames?: boolean
  page: number
}

function fixGame(
  game: GameWithDups,
  platform: PlatformDups
) {
  // as things are deleted, ensure we still loop everything
  for (let index = game.controllers.length - 1; index >= 0; --index) {
    const control = game.controllers[index]
    fixControl(game, control, platform)
  }
}

async function fixControl(
  game: GameWithDups,
  control: ControllerDup,
  platform: PlatformDups,
) {
  for (let index = control.duplicates.length - 1; index >= 0; --index) {
    const dup = control.duplicates[index]
    const parentNode = dup.element.parentNode as ParentNode
    parentNode.removeChild(dup.element)
  }
  
  const controlIndex = game.controllers.findIndex(
    x => x.control.details.controllerId === control.control.details.controllerId &&
    x.control.details.gameId === control.control.details.gameId
  )

  if ( controlIndex >= 0 ) {
    game.controllers.splice(controlIndex, 1)
  }

  // if we've dealt with all duplicates, we can remove it as a listed item
  if ( game.controllers.length === 0 ) {
    const gameId = game.gameId
    const index = platform.gamesWithDups.findIndex(x => x.gameId === gameId)
    if ( index >= 0 ) {
      platform.gamesWithDups.splice(index, 1)
    }
  }
}

interface SupportDuplicate {
  support: ControllerSupport
  duplicates: ControllerSupport[]
}