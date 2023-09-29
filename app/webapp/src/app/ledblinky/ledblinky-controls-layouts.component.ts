import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core"
import { BehaviorSubject, Observable, Subscription, combineLatest, firstValueFrom, from, mergeMap, of, shareReplay } from "rxjs"
import { IniNameValuePairs, LightsControlConfig, getMissingLights } from './LedBlinky.utils'
import { animations } from "ack-angular-fx"
import { PlayerControl } from "./PlayerControl.class"
import { LightAndControl, LightControl } from "./LightAndControl.interface"
import { LedblinkyLayouts } from "./ledblinky-layouts.component"
import { SessionProvider } from "../session.provider"
import { NewPlayer, PlayerDetails } from "./Player.class"
import { Light, LightDetails } from "./Light.class"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { NewControlGroup } from "./ControlGroup.class"
import { createElement } from "../launchbox/games.utils"

@Component({
  selector: 'ledblinky-controls-layouts',
  templateUrl: './ledblinky-layouts.component.html',
  animations,
  exportAs: 'ledblinkyControlLayouts'
}) export class LedblinkyControlsLayoutsComponent extends LedblinkyLayouts {
  @Input() controlGroup!: NewControlGroup
  @Input() romControlLights$!: Observable<LightAndControl[]>
  // @Input() controls!: LedBlinkyControls // used to color mame games

  @Output() override changed = new EventEmitter<LightsControlConfig>()
  @Output() controlChanged = new EventEmitter<PlayerControl>()
  @Output() lightControlChanged = new EventEmitter<LightAndControl>()

  @Output() override modalOpen = new EventEmitter<LightAndControl>()
  @Output() override modalClose: EventEmitter<any> = new EventEmitter<LightAndControl>()
  // @Output() override showLightDetails$ = new BehaviorSubject<LightAndControl | undefined>(undefined)

  constructor(
    public override session: SessionProvider,
  ) {
    super(session)

    this.subs.add(
      this.showLightDetails$.subscribe(lightControl => {
        const lc = lightControl as LightAndControl
        if ( !lc || !lc.control ) {
          this.lightChangeSubs.unsubscribe()
          const modal = this.getLightDetailsModalElm()
          if ( modal ) {
            modal.close()
          }
      
          return
        }

        lc.control.edit = true
      })
    )
    
    // manage showing/closing modal
    this.subs.add(
      this.showLightDetails$.subscribe((lightControl) => {
        const lightAndControl = lightControl as LightAndControl | undefined
        
        // it might be time to close modal and unsubscribe previous subs
        if ( !lightAndControl || !lightAndControl.control ) {
          this.lightChangeSubs.unsubscribe()
          this.lightChangeSubs = new Subscription()
          return
        }

        // while modal is open, lets listen for control changes
        this.lightChangeSubs.add(
          lightAndControl.control.xml.detailsChanged$.subscribe(_details => {
            this.controlChanged.emit(lightAndControl.control)
            this.lightControlChanged.emit(lightAndControl)
            // this.playersControls$$.next(this.playersControls) // causes re-merge of data
            this.buildRomControlLights() // causes redisplay of data
          })
        )
      })
    )

    this.lights$ = this.createLightsObservable()
  }

  // MAIN driver of light-to-control data. Marries lights with controls for layout display
  override lights$: Observable<LightAndControl[] | undefined>

  createLightsObservable() {
    const dependencies = [
      this.session.ledBlinky.directory$,
      this.session.ledBlinky.layoutName$,
      this.session.ledBlinky.animEditorObject$,
    ]

    if ( this.romControlLights$ ) {
      dependencies.push(this.romControlLights$ as any)
    }

    return combineLatest(dependencies).pipe(
      mergeMap(([
        dir,
        layoutName,
        animEditorObject,
        romControlLights,
      ]) => {
        if ( !dir || !layoutName || !animEditorObject ) {
          return []
        }

        if ( romControlLights ) {
          return of(romControlLights as unknown as LightAndControl[])
        }

        return from(
          super.getLightsLayout(
            dir as DirectoryManager,
            animEditorObject as IniNameValuePairs,
            layoutName as string,
          ) as Promise<LightAndControl[] | undefined>
        )
      }),
      shareReplay(1)
    )
  }

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

  ngOnInit(){
    this.createLightsObservable()
  }
  
  romControlSub = new Subscription()
  ngOnChanges( changes: SimpleChanges ){
    if ( changes['romControlLights$'] ) {
      this.romControlSub.unsubscribe()
      this.romControlSub = this.romControlLights$.subscribe(x => {
        this.buildRomControlLights()
      })

      this.lights$ = this.createLightsObservable()
    }
  }

  override ngOnDestroy(): void {
    this.romControlSub.unsubscribe()
  }

  override async getLightsLayout(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs,
    layoutName?: string,
  ): Promise<LightAndControl[] | undefined> {
    if ( this.romControlLights$ ) {
      return [] //
      // return this.buildRomControlLights() // it will be built on its own within ngOnChanges
    }

    return super.getLightsLayout(
      directory,
      animEditorObject,
      layoutName,
    ) as Promise<LightAndControl[] | undefined>
  }

  async buildRomControlLights() {
    const [directory, animEditorObject, romControlLights] = await Promise.all([
      firstValueFrom(this.session.ledBlinky.directory$),
      firstValueFrom(this.session.ledBlinky.animEditorObject$),
      firstValueFrom(this.romControlLights$),
    ])

    this.applyBounds(romControlLights.map(x => x.light))

    const lightConfig = await this.session.ledBlinky.getFxEditorByDir(directory, animEditorObject)
    if ( !lightConfig ) {
      return romControlLights
    }

    this.lightConfig = {
      lightControls: romControlLights,
      lights: romControlLights.map(light => light.light),
      settings: lightConfig.settings,
      file: lightConfig.file,
    }

    return romControlLights
  }

  closeModal() {
    const light = this.showLightDetails$.value
    this.showLightDetails$.next(undefined)
    this.modalClose.emit(light)
    const modal = this.getLightDetailsModalElm()
    modal.close()
  }

  override newLightControl(
    lightName: string,
    // controlGroup: NewControlGroup,
  ): LightAndControl {
    const controlGroup = this.controlGroup
    const details: LightDetails = {
      name: lightName,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 20,
    }

    const controls: PlayerControl[] = []
    const playerDetails = {} as PlayerDetails
    const player = new NewPlayer(
      playerDetails,
      controlGroup,
      controls,
      0,
      createElement('player'),
      this.session.ledBlinky
    )
    const control = new PlayerControl(this.session.ledBlinky, controls, player)
    const light: Light = new Light(details)
    const lightAndControl: LightAndControl = new LightAndControl(light, control, this.session.ledBlinky)

    return lightAndControl
  }
}
