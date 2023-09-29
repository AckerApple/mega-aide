import { Component, ContentChild, Directive, ElementRef, EventEmitter, Input, Output, TemplateRef } from "@angular/core"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, firstValueFrom, from, mergeMap, Observable, of, shareReplay, Subscription } from "rxjs"
import { SessionProvider } from "../session.provider"
import { IniNameValuePairs, LightDrag, LightsConfig, LightsControlConfig, getMissingLights } from './LedBlinky.utils'
import { animations } from "ack-angular-fx"
import { LightAndControl, LightControl } from "./LightAndControl.interface"
import { Light, LightDetails } from "./Light.class"
import { ModalElement } from "./ModalElement"

let count = 0

@Directive()
export class LedblinkyLayouts {
  uid = ++count

  @Input() edit?: boolean | string
  // @Input() emulator?: Emulator | NewEmulator // used for coloring non mame games
  @Input() changeWatch?: any // cause re-rendering
  @Input() widthFull: boolean | string = false
  @Input() interactive: boolean = true

  @Output() lightChanged = new EventEmitter<Light>()
  @Output() changed = new EventEmitter<LightsControlConfig>()
  @Output() modalOpen = new EventEmitter<any>() // LightControl | LightAndControl
  @Output() modalClose = new EventEmitter<LightControl>()
  @ContentChild('modalTemplate', { static: false }) modalTemplate?: TemplateRef<ElementRef>

  // intended to be overwritten
  @Output() showLightDetails$ = new BehaviorSubject<LightControl | undefined>(undefined)

  lastLightDrag?: LightDrag
  // playersControls$$ = new BehaviorSubject<NewControlGroup | undefined>(undefined)

  lightConfig?: LightsControlConfig
  selectedLights: Light[] = []

  bounds: {
    vertical: {min: number, max: number}
    horizontal: {min: number, max: number}
  } = {
    vertical: {min: 0, max: 0},
    horizontal: {min: 0, max: 0},
  }

  constructor(public session: SessionProvider) {}

  stopDrag($event: MouseEvent) {
    $event.preventDefault()
    $event.stopPropagation()
  }
  
  subs = new Subscription()
  lightChangeSubs = new Subscription()

  ngOnDestroy(){
    this.subs.unsubscribe()
    this.lightChangeSubs.unsubscribe()
  }

  async getLightConfig(
    lightConfig: LightsConfig,
  ): Promise<LightControl[]> {
    // loop all lights and remap the colors
    const proms = lightConfig.lights.map(async light => {
      let clone: Light = new Light({...light.details})

      const lightAndControl: LightControl = {
        light: clone,
      }

      return lightAndControl
    })

    const config = await Promise.all(proms)

    this.applyBounds(config.map(x => x.light))
    
    return config
  }

  /** maintains record of closest and farthest x and y coords */
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

  async addLight(
    lights: LightControl[],
    lightName?: string
  ) {
    if ( !lightName ) {
      return
    }
    
    const lightControl = this.newLightControl(lightName)
    lights.push(lightControl)
  }

  newLightControl(
    lightName: string
  ): LightControl {
    const details: LightDetails = {
      name: lightName,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 20,
    }

    const lightControl: LightControl = {
      light: new Light(details),
    }

    return lightControl
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

  async getLightsLayout(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs,
    layoutName?: string,
  ): Promise<LightControl[] | undefined> {
    if ( layoutName ) {
      return this.getLightsLayoutByName(layoutName, directory)
    }

    const lightConfig = await this.session.ledBlinky.getFxEditorByDir(directory, animEditorObject)
    if ( !lightConfig ) {
      return
    }

    const lightControls = await this.getLightConfig(lightConfig)
    this.lightConfig = {
      lightControls: lightControls,
      lights: lightControls.map(light => light.light),
      settings: lightConfig.settings,
      file: lightConfig.file,
    }
    return lightControls
  }

  async handleModalLight(currentModal: LightControl, lightControls: LightControl[]) {
    const currentDetails = await firstValueFrom(currentModal.light.details$)

    // TODO, need a match by light.details.name
    const lightDetailProms = lightControls.map(async (lightControl) => ({
      details: await firstValueFrom(lightControl.light.details$),
      lightControl,
    }))

    const lightDetails = await Promise.all(lightDetailProms)
    const updateModalTo = lightDetails.findIndex(c => c.details.name === currentDetails.name)
    if (updateModalTo >= 0) {
      const modal = this.getLightDetailsModalElm()
      modal.showModal()
      this.showLightDetails$.next(lightDetails[updateModalTo].lightControl)
    }
  }

  async getLightsLayoutByName(
    layoutName: string,
    directory: DirectoryManager,
  ) {
    const ledBlinky = this.session.ledBlinky

    const lightLayoutConfig = await ledBlinky.getLightLayoutByName(directory, layoutName)
    if ( !lightLayoutConfig ) {
      return
    }
    
    const lightControls = await this.getLightConfig(lightLayoutConfig)

    // look if to update current open dialog/modal
    const currentModal = await firstValueFrom(this.showLightDetails$)
    if ( currentModal ) {
      await this.handleModalLight(currentModal, lightControls)
    }

    this.lightConfig = {
      lightControls: lightControls,
      lights: lightControls.map(light => light.light),
      settings: lightLayoutConfig.settings,
      file: lightLayoutConfig.file,
    }

    return lightControls
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
    const lights: LightAndControl[] = await firstValueFrom( this.lights$ )
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

  async previewSelectedLayoutFile() {
    const file = this.lightConfig?.file
    if ( !file ) {
      return
    }

    this.session.filePreview = {
      file, string: await file.readAsText()
    }
  }
  
  lights$!: Observable<LightControl | LightAndControl | any>

  showLight(light: LightControl) {
    const elm = this.getLightDetailsModalElm()
    elm.showModal()

    this.showLightDetails$.next( light )
    this.modalOpen.emit( light )
  }

  getLightDetailsModalElm(): ModalElement {
    return document.getElementById('showLightDetailsModal_'+this.uid) as any
  }
}

@Component({
  selector: 'ledblinky-layouts',
  templateUrl: './ledblinky-layouts.component.html',
  animations,
  exportAs: 'ledblinkyLayouts'
}) export class LedblinkyLayoutsComponent extends LedblinkyLayouts {
  @Output() override modalOpen = new EventEmitter<LightControl>()
  @Output() override showLightDetails$ = new BehaviorSubject<LightControl | undefined>(undefined)

  override lights$: Observable<LightControl[] | undefined> = combineLatest([
    this.session.ledBlinky.directory$,
    this.session.ledBlinky.layoutName$,
    this.session.ledBlinky.animEditorObject$,
  ]).pipe(
    mergeMap(([dir, layoutName, animEditorObject]) => {
      if ( !dir || !layoutName || !animEditorObject ) {
        this.session.warn(`Cannot build lights layout in ${LedblinkyLayoutsComponent.constructor.name}`)
        return []
      }

      const promise = this.getLightsLayout(dir, animEditorObject, layoutName)
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

  closeModal() {
    const light = this.showLightDetails$.value
    this.showLightDetails$.next(undefined)
    this.modalClose.emit(light)
    const modal = this.getLightDetailsModalElm()
    modal.close()
  }
}
