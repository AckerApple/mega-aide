import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { InputsMap, Emulator, NewEmulator } from './LedBlinky.utils'
import { Subscription } from 'rxjs'
import { MamePortMap } from './mame.class'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap } from '../ledblinky.routing.module'

@Component({
  templateUrl: './ledblinky-controls.component.html',
  animations,
})
export class LEDBlinkyControlsComponent {
  unknownMode?: boolean
  search = ''
  goto?: boolean | string // ?goto=true means on load goto result if only 1 (when used its reset to undefined)

  unknownGames?: NewEmulator[]
  emulators?: Emulator[]
  filteredEmulators?: (NewEmulator | Emulator)[]

  inputMaps?: InputsMap
  mamePortMaps?: MamePortMap[] // used to color mame games
  routes = routeMap

  showSelectLaunchBox?: boolean
  // closeMameWarn?: boolean
  subs = new Subscription()

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public session: SessionProvider,
  ) {
    if ( this.session.ledBlinky.directory ) {
      this.readDir()
    }

    this.subs.add(
      this.session.ledBlinky.directoryChange.subscribe(() => 
        this.readDir()
      )
    )

    this.subs.add(
      this.session.launchBox.directoriesChange.subscribe(dir => {
        const ledBlinkyDir = this.session.ledBlinky.directory
        if ( !ledBlinkyDir ) {
          return // not interested
        }

        this.readDir()
      })
    )

    const requestSearch = this.activatedRoute.snapshot.queryParams['search']
    if ( requestSearch ) {
      this.search = requestSearch
    }
    
    const goto = this.activatedRoute.snapshot.queryParams['goto']
    this.goto = goto
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
  
  async readDir() {
    const ledBlinky = this.session.ledBlinky
    await ledBlinky.getControls()
    this.unknownGames = await ledBlinky.getUnknownGames()
    this.emulators = ledBlinky.controls?.emulators

    // check if emulator name requested in child path
    if ( this.emulators ) {
      const route = this.activatedRoute
      const childRoute = route.children[0]
      if ( childRoute ) {
        const reqEmuName = childRoute.snapshot.paramMap.get('emuName') as string
        if ( reqEmuName ) {
          const emulator = findEmulatorByName(this.emulators, reqEmuName)
          ledBlinky.emulator = emulator
        }
      }
    }
    
    this.performSearch()
  }

  newSearch(){
    const ledBlinky = this.session.ledBlinky
    delete ledBlinky.emulator
    this.performSearch()
  }
  
  performSearch() {
    const ledBlinky = this.session.ledBlinky
    const emulators = this.unknownMode ? this.unknownGames : this.emulators

    if ( !emulators ) {
      if ( this.unknownMode ) {
        this.session.error('Could not load unknown LEDBlinky emulators')
      } else {
        this.session.error('Could not load LEDBlinky emulators')
      }
      return
    }

    if ( !this.search ) {
      this.filteredEmulators = emulators

      if ( ledBlinky.emulator ) {
        const find = (x: NewEmulator | Emulator) => x.element === (ledBlinky.emulator as Emulator)?.element
        const match = emulators.find(find)
        if ( match ) {
          ledBlinky.emulator = match
        }
      }  
      return
    }

    ++this.session.loading
    const search = this.search.toLowerCase().replace(/_/g,' ')
    this.filteredEmulators = emulators
      .map(x => {
        const clone: NewEmulator | Emulator = {...x}
        const controlGroups = clone.controlGroups
        clone.controlGroups = controlGroups.filter(x => {
          if ( x.voice ) {
            if ( x.voice.toLowerCase().includes(search) ) {
              return true
            }
          }

          const test = x.groupName.toLowerCase().replace(/_/g,' ')
          const matched = test.includes(search)
          return matched
        })
        return clone
      }) // clone
      .filter((emu, index) => {
        const emuCaseName = emu.details.emuname.toLowerCase().replace(/_/g,' ')
        // if emulator name matches, then restore controlGroups
        if ( emuCaseName.includes(search) ) {
          emu.controlGroups = emulators[index].controlGroups // restore controlGroups because emulator name matched
          return true
        }
        
        if ( !emu.controlGroups.length ) {
          return false
        }

        return true
      })

    // should we goto the only result?
    this.afterSearch()
    
    --this.session.loading
  }

  afterSearch() {
    const goto = this.goto
    delete this.goto // never goto more than once

    if ( !goto ) {
      return
    }

    // is there only one emulator in the search?
    const emus = this.filteredEmulators
    if ( emus?.length !== 1 ) {
      return // no more work todo
    }

    const ledBlinky = this.session.ledBlinky
    
    // is there only one ROM in the search?
    const emu = ledBlinky.emulator = emus[0]
    if ( emu.controlGroups.length !== 1 ) {
      return // no more work todo
    }

    const emulator = ledBlinky.emulator
    if ( !emulator ) {
      return
    }

    const emuname = emulator.details.emuname
    const romname = emulator.controlGroups[0].groupName
    const url = `/${this.routes.ledblinkyControls.path}/${emuname}/${romname}`
    // goto dedicated page
    this.router.navigate([url], {
      relativeTo: this.activatedRoute,
      queryParams: {
        unknownMode: this.unknownMode,
      }, 
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    })
  }

  toggleUnknownMode() {
    this.unknownMode = !this.unknownMode

    const selectedEmu = this.session.ledBlinky.emulator
    if ( selectedEmu ) {
      let emu: NewEmulator | undefined

      if ( this.unknownMode ) {
        emu = this.unknownGames?.find(emu => emu.details.emuname === selectedEmu.details.emuname)
      } else {
        emu = this.emulators?.find(emu => emu.details.emuname === selectedEmu.details.emuname)
      }

      if ( emu ) {
        this.session.ledBlinky.emulator = emu
      }
    }

    this.performSearch()
  }
}


export function findEmulatorByName(emulators: NewEmulator[], name: string) {
  const emuName = name.toLowerCase().replace(/_/g,' ')
  return emulators?.find(x => x.details.emuname.toLowerCase().replace(/_/g,' ') === emuName)
}