import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { InputsMap, Emulator, NewEmulator, ControlGroup, LedBlinkyControls } from './LedBlinky.utils'
import { BehaviorSubject, combineLatest, from, lastValueFrom, map, mergeMap, Observable, of, shareReplay, Subject, Subscription } from 'rxjs'
import { MamePortMap } from './mame.class'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap } from '../ledblinky.routing.module'

@Component({
  templateUrl: './ledblinky-controls.component.html',
  animations,
})
export class LEDBlinkyControlsComponent {
  // emulators?: Emulator[]
  unknownMode$ = new BehaviorSubject(false)
  goto?: boolean | string // ?goto=true means on load goto result if only 1 (when used its reset to undefined)
  
  inputMaps?: InputsMap
  mamePortMaps?: MamePortMap[] // used to color mame games
  routes = routeMap

  // unknownGames?: NewEmulator[]
  unknownGames$ = this.session.ledBlinky.unknownGames$.pipe(
    shareReplay(1),
  )

  // search = ''
  search$ = new BehaviorSubject<string>('')

  emulators$ = combineLatest([
    this.session.ledBlinky.controls$,
    this.unknownGames$,
    this.session.ledBlinky.directory$
  ])
  .pipe(
    mergeMap(([controls, unknownGames]) => {
      if ( !controls ) {
        return []
      }

      const emulators = this.getEmulators(controls, unknownGames)  
      return from(emulators)
    })
  )

  roms$ = combineLatest([
    this.session.ledBlinky.emulator$,
    this.unknownMode$,
    this.unknownGames$,
    this.emulators$,
  ]).pipe(
    map(([emulator, unknownMode, unknownGames, emulators]) => {
      const typeEmu = emulator
      if ( typeEmu ) {
        if ( unknownMode ) {
          emulator = unknownGames?.find(emu => emu.details.emuname === typeEmu.details.emuname)
        } else {
          emulator = emulators?.find(emu => emu.details.emuname === typeEmu.details.emuname)
        }
      }
      
      return emulator
    })
  )

  // filteredEmulators?: (NewEmulator | Emulator)[]
  filteredEmulators$: Observable<(Emulator | NewEmulator)[]> = combineLatest([
    this.search$,
    this.emulators$,
    this.unknownMode$,
    this.unknownGames$,
    this.session.ledBlinky.emulator$,
    this.session.ledBlinky.directory$,
  ]).pipe(
    mergeMap(([
      search,
      emulators,
      unknownMode,
      unknownGames,
      emulator,
    ]) => {
      if ( unknownMode && unknownGames ) {
        emulators = unknownGames
      }

      const typedEmu = emulator
      if ( typedEmu ) {
        if ( unknownMode ) {
          emulator = unknownGames?.find(emu => emu.details.emuname === typedEmu.details.emuname)
        } else {
          emulator = emulators?.find(emu => emu.details.emuname === typedEmu.details.emuname)
        }

        if ( emulator ) {
          return of([ emulator ])
        }
      }


      if ( !search ) {
        return of(emulators)
      }

      const trueSearch = search.toLowerCase().replace(/_/g,' ')

      this.session.load$.next(1)
      const filteredEmulators = emulators
        .map(x => {
          const clone: NewEmulator | Emulator = {...x}
          const controlGroups = clone.controlGroups
          clone.controlGroups = controlGroups.filter(x => {
            if ( x.voice ) {
              if ( x.voice.toLowerCase().includes(trueSearch) ) {
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
      this.afterSearch(filteredEmulators)
      
      this.session.load$.next(-1)
  
      return of(filteredEmulators)
    })
  )

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public session: SessionProvider,
  ) {
    /*
    this.subs.add(
      this.session.ledBlinky.directory$.subscribe(() =>
        this.readDir()
      )
    )

    this.subs.add(
      this.session.ledBlinky.directoryChange.subscribe(() => 
        this.readDir()
      )
    )
    
    this.subs.add(
      this.session.launchBox.directory$.subscribe(() => {
        this.readDir()
      })
    )
    */

    const requestSearch = this.activatedRoute.snapshot.queryParams['search']
    if ( requestSearch ) {
      this.search$.next( requestSearch )
    }
    
    const goto = this.activatedRoute.snapshot.queryParams['goto']
    this.goto = goto
  }

  newSearch($event: string){    
    const emu = this.session.ledBlinky.emulator$.getValue()
    if ( emu ) {
      this.router.navigate(['./'], {
        relativeTo: this.activatedRoute,
        // queryParams: { unknownMode }, 
        queryParamsHandling: 'merge', // remove to replace all query params by provided
      })
      this.session.ledBlinky.emulator$.next(undefined)
    }
    this.search$.next($event);
  }

  async getEmulators(
    controls: LedBlinkyControls,
    unknownGames?: NewEmulator[],
  ) {
    if ( !controls ) {
      return []
    }

    const controlEmulators = controls.emulators
    const unknownMode = this.unknownMode$.getValue()
    const emulators = unknownMode ? unknownGames : controlEmulators

    if ( !emulators ) {
      if ( unknownMode ) {
        this.session.error('Could not load unknown LEDBlinky emulators')
      } else {
        this.session.error('Could not load LEDBlinky emulators')
      }
      return []
    }

    const route = this.activatedRoute
    const childRoute = route.children[0]
    if ( childRoute ) {
      const reqEmuName = childRoute.snapshot.paramMap.get('emuName') as string
      if ( reqEmuName ) {
        const emulator = findEmulatorByName(emulators, reqEmuName)
        this.session.ledBlinky.emulator$.next( emulator )
      }
    }

    return emulators
  }

  afterSearch(emus: NewEmulator[]) {
    const goto = this.goto
    delete this.goto // never goto more than once

    if ( !goto ) {
      return
    }

    // is there only one emulator in the search?
    if ( emus?.length !== 1 ) {
      return // no more work todo
    }

    const ledBlinky = this.session.ledBlinky
    
    // is there only one ROM in the search?
    const emu = emus[0]
    ledBlinky.emulator$.next( emu )
    if ( emu.controlGroups.length !== 1 ) {
      return // no more work todo
    }

    const emuname = emu.details.emuname
    const romname = emu.controlGroups[0].groupName
    const url = `/${this.routes.ledblinkyControls.path}/${emuname}/${romname}`
    const unknownMode = this.unknownMode$.getValue()

    // goto dedicated page
    this.router.navigate([url], {
      relativeTo: this.activatedRoute,
      queryParams: { unknownMode }, 
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    })
  }
}


export function findEmulatorByName(emulators: NewEmulator[], name: string) {
  const emuName = name.toLowerCase().replace(/_/g,' ')
  return emulators?.find(x => x.details.emuname.toLowerCase().replace(/_/g,' ') === emuName)
}