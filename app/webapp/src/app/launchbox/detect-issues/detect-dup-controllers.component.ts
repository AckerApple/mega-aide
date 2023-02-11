import { Component } from "@angular/core"
import { animations } from "ack-angular-fx"
import { combineLatest, BehaviorSubject, firstValueFrom, map, Observable, debounceTime, distinctUntilChanged, delay } from "rxjs"
import { GameInsight, PlatformInsights, SessionProvider } from "src/app/session.provider"
import { xmlDocToString } from "src/app/xml.functions"
import { ControllerSupport } from "../LaunchBox.class"

@Component({
  animations,
  templateUrl: './detect-dup-controllers.component.html',
}) export class DetectDupControllersComponent {
  search$ = new BehaviorSubject('')

  private platforms: PlatformDups[] = [] // used to stop a search in progress
  platforms$: Observable<PlatformDups[]> = combineLatest([
    this.search$,
    this.session.launchBox.directory$,
  ]).pipe(
    debounceTime(300),
    map(([search]) => {
      const platforms: PlatformDups[] = this.platforms = []

      // safe change detection
      setTimeout(() => this.session.load$.next(1), 0)
      
      this.session.launchBox.eachPlatform(async (platform, {stop}) => {
        const controlSupports = await firstValueFrom(platform.controllerSupports$)

        const platformDups: PlatformDups = {
          platform, gamesWithDups: []
        }

        search = search ? search.toLowerCase() : ''
        
        for (const control of controlSupports) {
          if ( platforms !== this.platforms ) {
            stop()
            break
          }
  
          const game = platform.getGameById( control.details.gameId )

          if ( !game ) {
            console.warn('should not get here. A <ControllerSupport> has no matching game')
            continue
          }

          if ( search && !game.details.title.toLowerCase().includes(search) ) {
            continue // not a search match
          }

          const existingGame = platformDups.gamesWithDups.find(item => item.game === game)
          if ( existingGame ) {
            const existingControl = existingGame.controllers.find(
              existingControl => existingControl.control.details.controllerId === control.details.controllerId
            )
            
            if ( existingControl ) {
              existingControl.duplicates.push(control)
              continue
            }

            existingGame.controllers.push({
              control, duplicates: [],
            })
            continue
          }

          platformDups.gamesWithDups.push({
            game,
            controllers: [{
              control, 
              duplicates: [],
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
      })
      .then(platforms => {
        this.session.load$.next(-1)
        return platforms
      })
      
      
      return platforms
    })
  )

  constructor( public session: SessionProvider ) {}

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
  game: GameInsight
  controllers: ControllerDup[]
  
  // ui controls
  show?: boolean
}

interface PlatformDups {
  platform: PlatformInsights
  gamesWithDups: GameWithDups[]
  
  // ui controls
  showGames?: boolean
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

function fixControl(
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

  if ( game.controllers.length === 0 ) {
    const index = platform.gamesWithDups.findIndex(x => x.game === game.game)
    if ( index >= 0 ) {
      platform.gamesWithDups.splice(index, 1)
    }
  }
}
