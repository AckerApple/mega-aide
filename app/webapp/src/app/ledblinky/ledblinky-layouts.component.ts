import { Component, Input, SimpleChanges } from "@angular/core";
import { SessionProvider } from "../session.provider";
import { ControlGroup, Emulator, getFileNameByPath, LedBlinkyControls, LightDetails, LightsConfig, NewControlGroup, NewEmulator } from './LedBlinky.utils'

@Component({
  selector: 'ledblinky-layouts',
  templateUrl: './ledblinky-layouts.component.html',
}) export class LedblinkyLayoutsComponent {
  @Input() edit?: boolean | string
  @Input() emulator?: Emulator | NewEmulator // used for coloring non mame games
  @Input() playersControls?: NewControlGroup | ControlGroup // used for coloring non mame games
  @Input() controls?: LedBlinkyControls // used to color mame games
  @Input() zoom?: number

  layoutName?: string
  layoutNames: string[] = []
  lightConfig?: LightsConfig
  lights?: LightDetails[] // made of lightConfig + playersControls + mamePortMaps

  bounds: {
    vertical: {min: number, max: number}
    horizontal: {min: number, max: number}
  } = {
    vertical: {min: 0, max: 0},
    horizontal: {min: 0, max: 0},
  }

  constructor(public session: SessionProvider) {}

  async ngOnInit(){
    this.reload()
  }

  ngOnChanges( changes: SimpleChanges ){
    if ( changes['layoutName'] ) {
      this.reload()
    }
  }

  async reload(){
    const ledBlinky = this.session.ledBlinky
    const directory = ledBlinky.directory
    
    if ( !directory ) {
      return
    }
    
    const lightConfig = this.lightConfig = await ledBlinky.loadFxEditorByDir()
    if ( !lightConfig ) {
      return
    }

    // load available layout files
    const files = await directory.listFiles()
    this.layoutNames = files.filter((v) => v.includes('.lay'))
    const fileName = lightConfig?.file.name
    if ( fileName ) {
      this.layoutName = getFileNameByPath( fileName )
    }

    this.readLightConfig(lightConfig)
  }

  readLightConfig(lightConfig: LightsConfig) {
    // loop all lights and remap the colors
    this.lights = lightConfig.lights.map(light => {
      let clone = {...light}

      if ( this.playersControls ) {
        remapPlayerControlsToLight(this.playersControls, clone)
      }

      return clone
    })

    this.applyBounds()
  }

  applyBounds() {
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

    if ( !this.lights ) {
      return
    }

    return this.bounds = this.lights.reduce((all, now) => {
      const pad = 15
      if ( now.x < all.horizontal.min || all.horizontal.min === 0 ) {
        all.horizontal.min = now.x - pad
      }

      if ( now.x > all.horizontal.max ) {
        const rightPad = now.name.length * pad
        all.horizontal.max = now.x + rightPad + pad
      }

      if ( now.y < all.vertical.min || all.vertical.min === 0 ) {
        all.vertical.min = now.y - pad
      }

      if ( now.y > all.vertical.max ) {
        all.vertical.max = now.y + (pad * 2)
      }

      return all
    }, {
      vertical: { min: 0, max: 0 },
      horizontal: { min: 0, max: 0 },
    })
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

  async loadLayoutByName(layoutName: string | undefined) {
    this.lightConfig = await this.session.ledBlinky.loadLightLayoutByName(layoutName)
    if ( this.lightConfig ) {
      this.readLightConfig( this.lightConfig )
    }
  }
}

function remapPlayerControlsToLight(
  playersControls: NewControlGroup | ControlGroup,
  light: LightDetails
) {  
  const players = playersControls.players
  if ( !players ) {
    return light
  }

  light.cssColor = '' // first remove layout color
  
  players.forEach(player => {
    const controls = player.controls
    controls.forEach(control => {
      if ( control.layoutLabel === light.name ) {
        light.cssColor = control.cssColor // change the color by passed in controller
      }
    })
  })

  return light
}
