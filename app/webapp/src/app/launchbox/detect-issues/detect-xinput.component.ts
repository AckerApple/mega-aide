import { Component } from "@angular/core"
import { backups } from '../routing.backups'
import { detectXinputIssues } from '../detectXinputIssues.routing'
import { firstValueFrom, from, mergeMap, shareReplay, Subscription } from 'rxjs'
import { XArcadeXInputProvider } from '../../xarcade-xinput/XArcadeXInput.provider'
import { GameInsight, SessionProvider, WriteFile } from "src/app/session.provider"
import { xmlDocToString } from "src/app/xml.functions"
import { animations } from "ack-angular-fx"
import { MapStats, PlatformGameApp, readPlatformFile, readPlatformMap, recalculateMapCounts, updatePlatformByGame } from "./detect.utils"
import { changePlatformGameCommandMappings } from "../changePlatformGameCommandMappings.function"

@Component({
  animations,
  templateUrl: './detect-xinput.component.html',
}) export class DetectXinputComponent {
  routes = { backups, detectXinputIssues }
  scanning = 0
  
  noCommandPlatforms: PlatformGameApp[] = [] // platforms with games that DO NOT have and mappings
  searchPlatformGames: PlatformGameApp[] = [] // platforms with games that have mappings
  
  stats: MapStats = {
    mapCounts: {}
  }

  // files changed and saved
  changedPlatformGames: PlatformGameApp[] = [] // platforms with games that have been live edited
  savingFiles?: WriteFile[]

  platformGames: PlatformGameApp[] = []
  // platforms with games that have mappings
  platformGames$ = this.session.launchBox.directories$.pipe(
    mergeMap(() =>
      from(this.scanXarcade(this.platformGames))
    ),
    shareReplay(1)
  )
  
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

    // ignite
    firstValueFrom( this.platformGames$ )
  }

  loadXInputMappings() {
    if ( !this.session.launchBox.xarcadeDir ) {
      return
    }

    this.xarcade.directoryChange.next( this.session.launchBox.xarcadeDir )
  }

  platformChanged(platform: PlatformGameApp) {
    if ( !this.changedPlatformGames.find(x => x === platform) ) {
      this.changedPlatformGames.push(platform)
    }
  }

  readPlatformMaps(platformGames: PlatformGameApp[]) {
    // reset things that will be recalculated
    this.stats.hasDefaultMix = false
    
    platformGames.forEach(x => readPlatformMap(x, this.session.launchBox, this.stats))
    
    // after calculation
    recalculateMapCounts(this.stats, this.searchPlatformGames)
  }
  
  saveChangedFiles() {
    this.savingFiles = this.session.toSaveFiles = this.changedPlatformGames.map(platform => {
      return {
        file: platform.file,
        string: xmlDocToString(platform.xml),
      }
    })
  }

  async changeAllPlatformsTo(
    mapping:string,
    platformGames: PlatformGameApp[],
  ) {
    const xDir = await firstValueFrom(this.xarcade.directory$)
    const xPath = xDir.path
    platformGames.forEach(x => {
      changePlatformGameCommandMappings(x.xArcadeApps.mapped, x, xPath, mapping)
      changePlatformGameCommandMappings(x.xArcadeApps.unmapped, x, xPath, mapping)
    })
  }

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

    this.platformChanged(platform)
  }

  searchBy(text: string, platformGames: PlatformGameApp[]) {
    if ( !text ) {
      this.searchPlatformGames = platformGames
      recalculateMapCounts(this.stats, this.searchPlatformGames)
      return
    }

    text = text.toLowerCase()
    this.searchPlatformGames = platformGames.map(platform => {
      // shallow clone
      const clone = { ...platform }
      clone.xArcadeApps = { ...clone.xArcadeApps }
      
      const searchFunc = (map: GameInsight) => {
        return map.details.title.toLowerCase().includes( text )
      }

      clone.xArcadeApps.mapped = clone.xArcadeApps.mapped.filter(searchFunc)
      clone.xArcadeApps.unmapped = clone.xArcadeApps.unmapped.filter(searchFunc)
      
      return clone
    }).filter(platform => platform.xArcadeApps.mapped.length || platform.xArcadeApps.unmapped.length)
    
    recalculateMapCounts(this.stats, this.searchPlatformGames)
  }

  
  /** Scan launchbox platforms looking for games with additional apps containing xarcade references
   * The first function
  */
  async scanXarcade(
    platformGames: PlatformGameApp[]
  ): Promise<PlatformGameApp[]>  {   
    this.stats.mapCounts = {}
    this.stats.hasDefaultMix = false
    platformGames.length = 0
    this.noCommandPlatforms.length = 0
    
    // the search will be a filtered list of platformGames
    this.searchPlatformGames = platformGames

    let count = 0
    ++this.scanning
    await this.session.launchBox.eachPlatform(async (platform) => {
      ++count
      const result = await readPlatformFile(platform, this.session.launchBox, this.stats)

      if( result.xArcadeApps.commands.length ) {
        platformGames.push(result) // it has commands
      } else {
        this.noCommandPlatforms.push(result)
      }

      if ( count % 5 ) {
        platformGames.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
        this.noCommandPlatforms.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
      }
    })
    --this.scanning

    platformGames.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)
    this.noCommandPlatforms.sort((a,b)=>String(a.name||'').toLowerCase()>String(b.name||'').toLowerCase()?1:-1)

    return platformGames
  }  
}
