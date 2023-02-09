import { Component, EventEmitter, Input, Output } from "@angular/core"
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { BehaviorSubject, combineLatest, firstValueFrom, from, map, mergeMap, of, shareReplay } from "rxjs"
import { SessionProvider } from "../session.provider"
import { ControlGroup, Emulator, getLastLayoutFileByLightsConfig, IniNameValuePairs, InputsMap, LedBlinkyControls, Light, LightDetails, LightsConfig, NewControlGroup, NewEmulator } from './LedBlinky.utils'

@Component({
  selector: 'ledblinky-layouts',
  templateUrl: './ledblinky-layouts.component.html',
}) export class LedblinkyLayoutsComponent {
  @Input() edit?: boolean | string
  @Input() emulator?: Emulator | NewEmulator // used for coloring non mame games
  @Input() playersControls?: NewControlGroup | ControlGroup // used for coloring non mame games
  @Input() controls?: LedBlinkyControls | null // used to color mame games
  @Input() widthFull: boolean | string = false

  @Output() changed = new EventEmitter<LightsConfig>()

  // set user changed layoutNames here
  layoutName$$ = new BehaviorSubject<string | undefined>(undefined)
  showLightDetails$ = new BehaviorSubject<Light | undefined | void>(undefined)
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
        return of()
      }
      
      const name = getLastLayoutFileByLightsConfig(animEditorObject)
      return of(name)
    }),
    shareReplay(1)
  )

  layoutNames: string[] = []
  lightConfig?: LightsConfig
  
  lights$ = combineLatest([
    this.session.ledBlinky.directory$,
    this.layoutName$,
    this.session.ledBlinky.animEditorObject$,
  ]).pipe(
    mergeMap(([dir, layoutName, animEditorObject]) => {
      if ( !dir || !layoutName || !animEditorObject ) {
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
    map(([lights, inputsMap]) => {
      if ( !lights || !inputsMap ) {
        return
      }
      const missing = getMissingLights(lights, inputsMap)
      return missing
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

  async getLightsLayout(
    directory: DirectoryManager,
    animEditorObject: IniNameValuePairs,
    layoutName?: string,
  ): Promise<Light[] | undefined> {
    const ledBlinky = this.session.ledBlinky
    // load available layout files
    const files = await directory.listFiles()
    this.layoutNames = files.filter((v) => v.includes('.lay'))
    if ( layoutName ) {
      const lightConfig = this.lightConfig = await ledBlinky.getLightLayoutByName(directory, layoutName)
      if ( !lightConfig ) {
        return
      }
      return this.getLightConfig( lightConfig )
    }

    const dir$ = await this.session.ledBlinky.getFxEditorByDir(
      directory, animEditorObject
    )
    const lightConfig = this.lightConfig = dir$
    if ( !lightConfig ) {
      return
    }

    return this.getLightConfig( lightConfig )
  }

  getLightConfig(lightConfig: LightsConfig) {
    // loop all lights and remap the colors
    const lights = lightConfig.lights.map(light => {
      let clone = {...light}

      if ( this.playersControls ) {
        remapPlayerControlsToLight(this.playersControls, clone)
      }

      return clone
    })

    this.applyBounds(lights)
    return lights
  }

  applyBounds(lights: Light[]) {
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
    
    this.bounds = lights.reduce((all, now) => {
      const details = now.details
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

    this.selectedLights.forEach(light => {
      light.startDragX = light.details.x
      light.startDragY = light.details.y
    })
  }

  updateLightByDrag(
    $event: MouseEvent,
    lastLightDrag: LightDrag
  ) {
    const { startOffsetX, startOffsetY, startX, startY } = lastLightDrag
    const zoom = (this.session.ledBlinky.zoom$.getValue() || 1)

    const xDiff = $event.pageX - startX
    const yDiff = $event.pageY - startY

    const offsetX = (startOffsetX + xDiff) / zoom
    const offsetY = (startOffsetY + yDiff) / zoom
    
    // lastLightDrag.light.details.x = offsetX
    // lastLightDrag.light.details.y = offsetY

    this.selectedLights.forEach(light => {
      light.details.x = (light as any).startDragX + xDiff / zoom
      light.details.y = (light as any).startDragY + yDiff / zoom
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
        return lightConfig.lights[index] = light
      }
      
      return Object.assign(lightConfig.lights[index], light)
    })
    this.changed.emit(this.lightConfig)
  }

  addLight(lights: Light[], lightName?: string) {
    if ( !lightName ) {
      return
    }
    
    lights.push({
      colorHex: '',
      cssColor: '#fff',
      details: {
        name: lightName,
        x: 0,
        y: 0,
        colorDec: 0,
        diameter: 20,
      }
    })
  }

  stopDrag($event: MouseEvent) {
    $event.preventDefault()
    $event.stopPropagation()
  }
}

function remapPlayerControlsToLight(
  playersControls: NewControlGroup | ControlGroup,
  light: Light,
) {  
  const players = playersControls.players
  if ( !players ) {
    return light
  }

  light.cssColor = '' // first remove layout color
  
  players.forEach(player => {
    const controls = player.controls
    controls.forEach(control => {
      if ( control.layoutLabel === light.details.name ) {
        light.cssColor = control.cssColor // change the color by passed in controller
      }
    })
  })

  return light
}

function getMissingLights(
  lights: Light[],
  inputsMap: InputsMap
): Light[] {
  // return lights.filter(light => !inputsMap.labels.find(name => name.label === light.name))
  const missing = inputsMap.labels.filter(
    label => !lights.find(light => light.details.name === label.label)
  )
  return missing.map(miss => ({
    colorHex: '',
    cssColor: '',
    details: {
      name: miss.label,
      x: 0,
      y: 0,
      colorDec: 0,
      diameter: 10,
    }
  }))
}

interface LightDrag {
  light: Light
  startOffsetY: number
  startOffsetX: number
  startX: number
  startY: number
}