import { Component } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { firstValueFrom, from, mergeMap, shareReplay } from "rxjs"
import { GameInsight, SessionProvider } from "src/app/session.provider"
import { xmlDocToString } from "src/app/xml.functions"
import { MapStats, PlatformGameApp, readPlatformFile, regMapXarcadeOnto, updatePlatformByGame } from "./detect.utils"

@Component({
  templateUrl: './detect-xinput-platform.component.html',
}) export class DetectXInputPlatformComponent {
  stats: MapStats = {
    mapCounts: {},
  }

  platform$ = this.session.launchBox.directory$.pipe(
    mergeMap(dir => {
      const platform = this.activatedRoute.snapshot.params['platform']
      this.stats.mapCounts = {} // reset counts
      const promise = this.session.launchBox.getPlatformFileByFileName(dir, platform)
        .then(async platform=> {
          if ( !platform ) {
            this.session.warn(`Cannot find platform file ${platform}`)
            return
          }

          const platformMap = await readPlatformFile(
            platform,
            this.session.launchBox,
            this.stats
          )

          const platGames = await firstValueFrom(platformMap.games$)
          const games = platGames.map(game => {
            const addApps = game.additionalApps || []
            
            addApps.forEach(app => {
              return regMapXarcadeOnto(game, app)
            })

            return game
          })

          return { platform: platformMap, games }
        })

      return from(promise)
    }),
    shareReplay(1),
  )

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute
  ) {}

  updatePlatformGames(
    platform: PlatformGameApp,
    games: GameInsight[],
  ) {
    const xarcadePath = this.session.launchBox.xarcadeDir?.path as string
    if ( !xarcadePath ) {
      this.session.error('Cannot determine xarcade path')
    }

    // must clone array to ensure its full looped
    const clone = new Array(...games)

    clone.forEach(game => 
      updatePlatformByGame(platform, game, this.stats, xarcadePath)
    )

    this.session.addFileToSave({
      file: platform.file,
      string: xmlDocToString(platform.xml),
    })
  }
}