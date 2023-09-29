import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { InputsMap, LedBlinkyControls } from './LedBlinky.utils'
import { BehaviorSubject, combineLatest, firstValueFrom, from, map, mergeMap, Observable, of, shareReplay } from 'rxjs'
import { MamePortMap } from './mame.class'
import { ActivatedRoute, Router } from '@angular/router'
import { routeMap } from '../ledblinky.routing.module'
import { Emulator, EmulatorDetails, NewEmulator } from './Emulator.class'
import { NewControlGroupings } from './ControlGroupings'
import { getElementsByTagName } from '../ledblinky/element.utils'
import { DmFileReader } from 'ack-angular-components/directory-managers/DmFileReader'
import { xmlDocToString } from '../xml.functions'
import { ControlGroupDetails } from './ControlGroup.class'

@Component({
  templateUrl: './ledblinky-controls.component.html',
  animations,
})
export class LEDBlinkyControlsComponent {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public session: SessionProvider,
  ) {
    const requestSearch = this.activatedRoute.snapshot.queryParams['search']
    if ( requestSearch ) {
      this.search$.next( requestSearch )
    }
    
    const goto = this.activatedRoute.snapshot.queryParams['goto']
    this.goto = goto
  }

  emulator$ = new BehaviorSubject<NewEmulator | Emulator | undefined>(undefined)

  showConfirmNewRom?: boolean
  unknownMode$ = new BehaviorSubject(false)
  goto?: boolean | string // ?goto=true means on load goto result if only 1 (when used its reset to undefined)
  
  inputMaps?: InputsMap
  mamePortMaps?: MamePortMap[] // used to color mame games
  routes = routeMap

  search$ = new BehaviorSubject<string>('')

  emulators$ = combineLatest([
    this.session.ledBlinky.controls$,
    this.session.ledBlinky.unknownGames$,
  ])
  .pipe(
    mergeMap(([controls, unknownGames]) => {
      if ( !controls ) {
        this.session.warn('No previous controls defined. Could be issue loading LEDBlinkyControls.xml')
        return []
      }

      const emulators = this.getEmulators(controls, unknownGames)

      return from(emulators)
    }),
    shareReplay(1),
  )
  
  // filteredEmulators?: (NewEmulator | Emulator)[]
  filteredEmulators$: Observable<(Emulator | NewEmulator)[]> = combineLatest([
    this.search$,
    this.emulators$,
    this.unknownMode$,
    this.session.ledBlinky.unknownGames$,
    this.emulator$,
    // this.session.ledBlinky.directory$,
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
        emulator = (emulators as Emulator[])?.find(emu => emu.xml.details.emuname === typedEmu.xml.details.emuname)

        if ( emulator ) {
          return of([ emulator ])
        }
      }

      if ( !search ) {
        return of(emulators)
      }

      const trueSearch = search.toLowerCase().replace(/_/g,' ')
      const filteredEmulators = emulators
        .map(iEmulator => {
          const clone: NewEmulator | Emulator = new Emulator(
            this.session.ledBlinky,
            {...iEmulator.xml.details},
            iEmulator.xml.element, // createElement('emulator'),
          )
          
          const controlGroups = clone.controlGroups = iEmulator.controlGroups
          
          clone.controlGroups = controlGroups.filter((x: NewControlGroupings) => {
            if ( x.voice ) {
              if ( x.voice.toLowerCase().includes(trueSearch) ) {
                return true
              }
            }
  
            // search the roms
            const test = x.groupName.toLowerCase().replace(/_/g,' ')
            const matched = test.includes(search)
            return matched
          })

          return clone
        }) // clone
        .filter((emu, index) => {
          const emuCaseName = emu.xml.details.emuname.toLowerCase().replace(/_/g,' ')

          // if emulator name matches, then restore controlGroups
          if ( emuCaseName.includes(trueSearch) ) {
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
 
      return of(filteredEmulators)
    }), shareReplay(1)
  )

  roms$ = combineLatest([
    this.emulator$,
  ]).pipe(
    map(([emulator]) => {
      return emulator
    })
  )

  newSearch($event: string){    
    const emu = this.emulator$.getValue()
    if ( emu ) {
      this.router.navigate(['./'], {
        relativeTo: this.activatedRoute,
        // queryParams: { unknownMode }, 
        queryParamsHandling: 'merge', // remove to replace all query params by provided
      })
      this.emulator$.next(undefined)
    }
    this.search$.next($event);
  }

  async getEmulators(
    controls: LedBlinkyControls,
    unknownGames?: NewEmulator[],
  ): Promise<NewEmulator[]> {
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
        this.emulator$.next( emulator )
      }
    }

    return emulators
  }

  afterSearch(
    emus: (Emulator | NewEmulator)[]
  ) {
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
    this.emulator$.next( emu )
    if ( emu.controlGroups.length !== 1 ) {
      return // no more work todo
    }

    const emuname = emu.xml.details.emuname
    const controlGroups = emu.controlGroups as NewControlGroupings[]
    const romname = controlGroups[0].groupName
    const url = `/${this.routes.ledblinkyControls.path}/${emuname}/${romname}`
    const unknownMode = this.unknownMode$.getValue()

    // goto dedicated page
    this.router.navigate([url], {
      relativeTo: this.activatedRoute,
      queryParams: { unknownMode }, 
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    })
  }

  saveFileXml(
    file: DmFileReader,
    xml: Document
  ) {
    const rawString = xmlDocToString(xml)
    // remove extra lines and then add a closing extra line return
    const string = rawString.replace(/\n\s+\n/g,'\n') + '\r'
    this.session.addFileToSave({ file, string })
  }

  // gets used as a link
  newRom: ControlGroupDetails = {
    groupName: '',
  }

  newEmulater: EmulatorDetails = {
    emuname: '',
    emuDesc: '',
  }
  async createNewEmulator() {
    const emulators = await firstValueFrom(this.emulators$)

    const duplicate = emulators.find(emulator => emulator.xml.details.emuname === this.newEmulater.emuname)
    if ( duplicate ) {
      alert('Emulator already exists')
      return
    }
    
    const details: EmulatorDetails = {...this.newEmulater}
    const emulator = new Emulator(
      this.session.ledBlinky,
      details,
    )

    // attempt to register new emulator within controls file by appending it to <dat> element
    const controlsFileMeta = await firstValueFrom(this.session.ledBlinky.controls$)
    const dats = getElementsByTagName(controlsFileMeta.xml, 'dat')

    if ( dats.length ) {
      dats[0].appendChild(emulator.xml.element)
    } else {
      this.session.warn('no where to add emulator to')
    }

    this.emulator$.next( emulator )

    // reset newEmulator
    this.newEmulater.emuname = ''
    this.newEmulater.emuDesc = ''
    ;(document.getElementById('newEmulatorModal') as any).close()

    this.saveFileXml(controlsFileMeta.file, controlsFileMeta.xml)
  }
}


export function findEmulatorByName(
  emulators: (NewEmulator | Emulator)[],
  name: string
) {
  const emuName = name.toLowerCase().replace(/_/g,' ')
  return emulators?.find(x => x.xml.details.emuname.toLowerCase().replace(/_/g,' ') === emuName)
}