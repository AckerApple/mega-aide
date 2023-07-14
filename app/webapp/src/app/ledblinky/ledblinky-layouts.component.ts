import { Component, ContentChild, ElementRef, EventEmitter, Input, Output, SimpleChanges, TemplateRef } from "@angular/core"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, concatMap, finalize, firstValueFrom, from, map, mergeMap, Observable, of, shareReplay, Subject, Subscriber, switchMap, take, takeUntil, tap, toArray } from "rxjs"
import { SessionProvider } from "../session.provider"
import { LedBlinky } from "./LedBlinky.class"
import { castColorDetailsToCssColor, castControlDetailsToCssColor, ControlGroup, Emulator, getLastLayoutFileByLightsConfig, IniNameValuePairs, InputsMap, intToHex, LedBlinkyControls, Light, LightDetails, LightsConfig, LightsControlConfig, NewControlGroup, NewEmulator, NewPlayer, Player, PlayerControl } from './LedBlinky.utils'
import { animations } from "ack-angular-fx"
import { delay } from "../delay"

@Component({
  selector: 'ledblinky-layouts',
  templateUrl: './ledblinky-layouts.component.html',
  animations,
  exportAs: 'ledblinkyLayouts'
}) export class LedblinkyLayoutsComponent {
  @Input() edit?: boolean | string
  @Input() emulator?: Emulator | NewEmulator // used for coloring non mame games
  @Input() playersControls?: NewControlGroup
  @Input() changeWatch?: any // cause re-rendering
  @Input() controls?: LedBlinkyControls | null // used to color mame games
  @Input() widthFull: boolean | string = false

  @Output() changed = new EventEmitter<LightsControlConfig>()
  @Output() lightChanged = new EventEmitter<Light>()
  @Output() modalOpen = new EventEmitter<LightAndControl>()
  @Output() modalClose = new EventEmitter<void>()

  @ContentChild('modalTemplate', { static: false }) modalTemplate?: TemplateRef<ElementRef>

  // set user changed layoutNames here
  layoutName$$ = new BehaviorSubject<string | undefined>(undefined)
  @Output() showLightDetails$ = new BehaviorSubject<LightAndControl | undefined>(undefined)
  selectedLights: Light[] = []
  
  // lookup default or emit layoutName$$ value
  layoutName$ = combineLatest([
    this.session.ledBlinky.directory$,
    this.layoutName$$,
    this.session.ledBlinky.animEditorObject$,
  ]).pipe(
    mergeMap(([dir, layoutName, animEditorObject]) => {
      if ( layoutName || !dir ) {
        return of( layoutName )
      }
      
      if ( layoutName ) {
        return of(layoutName) // no default needed
      }
  
      if ( !animEditorObject ) {
        return of(null)
      }
      
      const name = getLastLayoutFileByLightsConfig(animEditorObject)
      return of(name)
    }),
    shareReplay(1)
  )

  layoutNames: string[] = []
  // lightConfig?: LightsConfig
  lightConfig?: LightsControlConfig
  
  playersControls$$ = new BehaviorSubject<NewControlGroup | undefined>(undefined)

  lights$ = combineLatest([
    this.session.ledBlinky.directory$,
    this.layoutName$,
    this.session.ledBlinky.animEditorObject$,
    this.playersControls$$,
  ]).pipe(
    mergeMap(([dir, layoutName, animEditorObject, playersControls]) => {
      if ( !dir || !layoutName || !animEditorObject ) {
        return []
      }

      const promise = this.getLightsLayout(dir, animEditorObject, layoutName, playersControls)
      return from( promise )
    }),
    shareReplay(1)
  )
  
  missingLights$ = combineLatest([
    this.lights$,
    this.session.ledBlinky.inputsMap$
  ]).pipe(
    mergeMap(([lights, inputsMap]) => {
      if ( !lights || !inputsMap ) {
        return of( undefined )
      }
      const lightArray = lights.map(config => config.light)
      const missing = getMissingLights(lightArray, inputsMap)
      return from(missing)
    })
  )

  bounds: {
    vertical: {min: number, max: number}
    horizontal: {min: number, max: number}
  } = {
    vertical: {min: 0, max: 0},
    horizontal: {min: 0, max: 0},
  }

  lastLightDrag?: LightDrag
  
  constructor(public session: SessionProvider) {}

  ngOnChanges( changes:SimpleChanges ){
    if ( changes['changeWatch'] ) {
      this.playersControls$$.next(this.playersControls)
    }
  }

  async getLightsLayout(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs,
    layoutName?: string,
    playersControls?: NewControlGroup
  ): Promise<LightAndControl[] | undefined> {
    const ledBlinky = this.session.ledBlinky
    // load available layout files
    const files: string[] = await directory.listFiles()
    
    const currentModal = await firstValueFrom(this.showLightDetails$)

    this.layoutNames = files.filter((v) => v.includes('.lay'))
    if ( layoutName ) {
      const lightConfig = await ledBlinky.getLightLayoutByName(directory, layoutName)
      if ( !lightConfig ) {
        return
      }

      // look to update current modal
      const lightControls = await this.getLightConfig(lightConfig, playersControls)
      console.log('look to update modal', currentModal)
      if ( currentModal ) {
        const currentDetails = await firstValueFrom(currentModal.light.details$)
        
        // TODO, need a match by light.details.name
        const lightDetailProms = lightControls.map(async lightControl => ({
          details: await firstValueFrom(lightControl.light.details$),
          lightControl,
        }))
        
        const lightDetails = await Promise.all(lightDetailProms)
        const updateModalTo = lightDetails.findIndex(c => c.details.name === currentDetails.name)
        if ( updateModalTo >= 0 ) {
          this.showLightDetails$.next(lightDetails[updateModalTo].lightControl)
        }
      }

      this.lightConfig = {
        lightControls: lightControls,
        lights: lightControls.map(light => light.light),
        settings: lightConfig.settings,
        file: lightConfig.file,
      }
      return lightControls
    }

    const dir$ = await this.session.ledBlinky.getFxEditorByDir(
      directory, animEditorObject
    )
    const lightConfig = dir$
    if ( !lightConfig ) {
      return
    }

    const lightControls = await this.getLightConfig(lightConfig, playersControls)
    this.lightConfig = {
      lightControls: lightControls,
      lights: lightControls.map(light => light.light),
      settings: lightConfig.settings,
      file: lightConfig.file,
    }
    return lightControls
  }

  async getLightConfig(
    lightConfig: LightsConfig,
    playersControls?: NewControlGroup, // game map of lights
  ): Promise<LightAndControl[]> {
    // loop all lights and remap the colors
    const proms = lightConfig.lights.map(async light => {
      let clone: Light = {
        ...light,
      }

      if ( playersControls ) {
        return await remapPlayerControlsToLight(
          playersControls,
          clone,
          this.session.ledBlinky,
        )
      }
      const lightAndControl: LightAndControl = {
        light: clone,
        
        gamesUsingSameLoadCount: 0,
        gamesUsingSame$: of(null).pipe(
          tap(() => ++lightAndControl.gamesUsingSameLoadCount),
          concatMap(() => getGamesUsing$(this.session.ledBlinky.controls$, light.details$)),
          finalize(() => --lightAndControl.gamesUsingSameLoadCount)
        ),
      }

      return lightAndControl
    })

    const config = await Promise.all(proms)

    this.applyBounds(config.map(x => x.light))
    
    return config
  }

  async applyBounds(lights: Light[]) {
    if ( this.edit ) {
      return this.bounds = {
        horizontal: {
          min: 0, max: 0
        },
        vertical: {
          min: 0, max: 0
        },
      }
    }
    
    const lightDetails = await Promise.all(lights.map(light => firstValueFrom(light.details$)))
    
    this.bounds = lightDetails.reduce((all, details) => {
      const pad = 15
      if ( details.x < all.horizontal.min || all.horizontal.min === 0 ) {
        all.horizontal.min = details.x - pad
      }

      if ( details.x > all.horizontal.max ) {
        const rightPad = details.name.length * pad
        all.horizontal.max = details.x + rightPad + pad
      }

      if ( details.y < all.vertical.min || all.vertical.min === 0 ) {
        all.vertical.min = details.y
      }

      if ( details.y > all.vertical.max ) {
        all.vertical.max = details.y + (pad * 2)
      }

      return all
    }, {
      vertical: { min: 0, max: 0 },
      horizontal: { min: 0, max: 0 },
    })

    return this.bounds
  }

  async previewSelectedLayoutFile() {
    const file = this.lightConfig?.file
    if ( !file ) {
      return
    }

    this.session.filePreview = {
      file, string: await file.readAsText()
    }
  }

  setLightDrag(
    $event: MouseEvent,
    light: Light,
  ) {
    this.lastLightDrag={
      light,
      // best
      // startOffsetY: $event.offsetY,
      // startOffsetX: $event.offsetX,

      startOffsetY: ($event.target as any).offsetTop,
      startOffsetX: ($event.target as any).offsetLeft,

      startY: $event.pageY,
      startX: $event.pageX
    }

    if ( !this.selectedLights.find(x => x === light) ) {
      this.selectedLights.push(light)
    }

    this.selectedLights.forEach(async light => {
      const details = await firstValueFrom(light.details$)
      light.startDragX = details.x
      light.startDragY = details.y
    })
  }

  updateLightByDrag(
    $event: MouseEvent,
    lastLightDrag: LightDrag
  ) {
    const { startX, startY } = lastLightDrag
    const zoom = (this.session.ledBlinky.zoom$.getValue() || 1)

    const xDiff = $event.pageX - startX
    const yDiff = $event.pageY - startY

    this.selectedLights.forEach(async light => {
      const details = await firstValueFrom(light.details$)
      details.x = (light as any).startDragX + xDiff / zoom
      details.y = (light as any).startDragY + yDiff / zoom
    })
  }

  updateLightDrag(
    $event: MouseEvent,
    _light: Light,
  ) {
    if ( !this.lastLightDrag ) {
      return
    }

    this.updateLightByDrag($event, this.lastLightDrag)
  }

  onDropLight($event: MouseEvent) {
    if ( !this.lastLightDrag ) {
      return
    }

    this.updateLightByDrag($event, this.lastLightDrag)
    delete this.lastLightDrag
    this.updated()
  }

  async updated() {
    const lights = await firstValueFrom( this.lights$ )
    const lightConfig = this.lightConfig
    if ( !lightConfig || !lights ) {
      return
    }

    lights.forEach((light, index) => {
      if ( !lightConfig.lights[index] ) {
        return lightConfig.lights[index] = light.light
      }
      
      return Object.assign(lightConfig.lights[index], light)
    })
    this.changed.emit(this.lightConfig)
  }

  addLight(
    lights: LightAndControl[],
    lightName?: string
  ) {
    if ( !lightName ) {
      return
    }

    const details$ = of({
      name: lightName,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 20,
    }).pipe( shareReplay(1) )
    
    const colorDec$ = new BehaviorSubject(0)
    const lightAndControl: LightAndControl = {
      gamesUsingSameLoadCount: 0,
      gamesUsingSame$: of(null).pipe(
        tap(() => ++lightAndControl.gamesUsingSameLoadCount),
        concatMap(() => getGamesUsing$(this.session.ledBlinky.controls$, details$)),
        finalize(() => --lightAndControl.gamesUsingSameLoadCount)
      ),
      light: {
        // cssColor$: new BehaviorSubject('#ffffff'),
        colorDec$,
        cssColor$: colorDec$.pipe(
          map(colorDec => intToHex(colorDec)),
        ),
        details$
      }
    }
    lights.push(lightAndControl)
  }

  stopDrag($event: MouseEvent) {
    $event.preventDefault()
    $event.stopPropagation()
  }

  updateLightColor(
    light: Light,
    details: LightDetails,
    cssColor: string,
  ) {
    const noHashColor = cssColor.replace('#','')
    details.colorDec = parseInt(noHashColor, 16)
    light.colorDec$.next(details.colorDec)
    this.lightChanged.emit(light)
  }

  closeModal() {
    this.showLightDetails$.next(undefined)
    this.modalClose.emit()
  }
}

/** Primary function to connect which layout light belongs to which game light config */
async function remapPlayerControlsToLight(
  playersControls: NewControlGroup | ControlGroup,
  light: Light,
  ledBlinky: LedBlinky, // curve$: Observable<number>
): Promise<LightAndControl> {  
  let control: PlayerControl | undefined
  let playerIndex: number | undefined
  let player: NewPlayer | undefined
  const players = playersControls.players
  
  if ( !players ) {
    const lightAndControl: LightAndControl = {
      light, control,
      gamesUsingSameLoadCount: 0,
      gamesUsingSame$: of(null).pipe(
        tap(() => ++lightAndControl.gamesUsingSameLoadCount),
        concatMap(() => getGamesUsing$(ledBlinky.controls$, light.details$)),
        finalize(() => --lightAndControl.gamesUsingSameLoadCount)
      ),
    }
    return lightAndControl
  }
  
  const proms = players.map(async (iPlayer, iPlayerIndex) => {
    const controls = iPlayer.controls
    const details = await firstValueFrom(light.details$)
    controls.forEach(async iControl => {
      // reset all lights to blank
      light.colorDec$.next(0) // resetting to black
      
      // default to change-able color
      light.cssColor$ = combineLatest([
        light.colorDec$,
        ledBlinky.curve$
      ]).pipe(
        map(([colorDec, curve]) => castColorDetailsToCssColor(
          intToHex(colorDec), ledBlinky.colors, curve
        ))
      )

      // see if we match remapping
      const layoutLabel = await firstValueFrom(iControl.layoutLabel$)

      // compare getLabelByInputCodes(iControl.inputCodes$) === details.name
      if ( layoutLabel === details.name ) {
        control = iControl
        player = iPlayer
        playerIndex = iPlayerIndex
        
        // matches need color controlled by game control layout
        light.cssColor$ = combineLatest([
          iControl.details$,
          ledBlinky.curve$,
        ]).pipe(
          map(([details, curve]) => castControlDetailsToCssColor(
            details, ledBlinky.colors, curve
          ))
        )
      }
    })
  })

  await Promise.all(proms)

  const lightAndControl: LightAndControl = {
    light, control, player, playerIndex,
    gamesUsingSameLoadCount: 0,
    gamesUsingSame$: of(null).pipe(
      tap(() => ++lightAndControl.gamesUsingSameLoadCount),
      concatMap(() => getGamesUsing$(ledBlinky.controls$, light.details$)),
      finalize(() => --lightAndControl.gamesUsingSameLoadCount)
    ),
  }

  return lightAndControl
}

async function getMissingLights(
  lights: Light[],
  inputsMap: InputsMap
): Promise<Light[]> {
  // return lights.filter(light => !inputsMap.labels.find(name => name.label === light.name))
  const promises = lights.map(light => firstValueFrom(light.details$))
  
  const details = await Promise.all(promises)
  
  const missing = inputsMap.labels.filter(
    label => !details.find(light => light.name === label.label)
  )

  return missing.map(miss => {
    const details$ = of({
      name: miss.label,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 10,
    })

    const colorDec$ = new BehaviorSubject(0)
    const cssColor$ = colorDec$.pipe(
      map(colorDec => intToHex(colorDec))
    )
  
    const light: Light = {
      details$,
      colorDec$,
      cssColor$,
    }

    return light
  })
}

interface LightDrag {
  light: Light
  startOffsetY: number
  startOffsetX: number
  startX: number
  startY: number
}

export interface LightAndControl {
  control?: PlayerControl
  player?: Player | NewPlayer
  playerIndex?: number
  light: Light
  
  gamesUsingSame$: Observable<EmulatorRom[]>
  gamesUsingSameLoadCount: number
}

async function emitRomsUsingSame(
  bs: Subscriber<EmulatorRom[]>,
  emus: Emulator[],
  details: LightDetails,
) {
  const emuRoms: EmulatorRom[] = []
  for (const emulator of emus) {
    for (const controlGroup of emulator.controlGroups) {
      for (const rom of controlGroup.controlGroups) {
        await delay(0) // add time gap to allow Angular rendering
        const romHasControl = await romHasLight(rom, details)

        if ( romHasControl ) {
          emuRoms.push({ rom, emulator })
          bs.next(emuRoms)
          break
        }
      }
    }
  }
  bs.complete()
}

async function romHasLight(
  rom: ControlGroup,
  details:LightDetails
) {
  for (const player of rom.players) {
    for (const control of player.controls) {
      const controlLabel = await firstValueFrom(control.layoutLabel$)
      if ( controlLabel === details.name ) {
        return true
      }
    }
  }
  return false
}

interface EmulatorRom {
  rom: ControlGroup
  emulator: Emulator
}

function getGamesUsing$(
  controls$: Observable<LedBlinkyControls | null | undefined>,
  details$: Observable<LightDetails>,
): Observable<EmulatorRom[]> {
  const destroy$ = new Subject<void>(); // Notifier to complete the chain

  return combineLatest([controls$, details$]).pipe(
    takeUntil(destroy$), // Complete the chain when the source observables complete
    switchMap(([controls, details]) => {
      const emus = controls?.emulators;

      if (!emus) {
        return of([]);
      }

      return new Observable<EmulatorRom[]>(sub => {
        emitRomsUsingSame(sub, emus, details);

        // Cleanup function to unsubscribe and complete the notifier
        return () => {
          destroy$.next();
          destroy$.complete();
        };
      });
    })
  );
}
