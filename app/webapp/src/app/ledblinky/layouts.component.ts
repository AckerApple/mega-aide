import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { firstValueFrom } from 'rxjs'
import { SessionProvider } from '../session.provider'
import { LightsConfig } from './LedBlinky.utils'
import { LedblinkyLayoutsComponent } from './ledblinky-layouts.component'
import { Light } from './Light.class'

@Component({
  templateUrl: './layouts.component.html',
  animations,
})
export class LayoutsComponent {

  constructor(
    public session: SessionProvider,
  ) {}

  configChanged(config: LightsConfig) {
    this.saveConfig(config)
  }

  async lightChanged(
    _light: Light,
    ledblinkyLayouts: LedblinkyLayoutsComponent
  ) {
    if ( !ledblinkyLayouts.lightConfig ) {
      this.session.error('expected ledblinkyLayouts.lightConfig')
      return
    }

    this.saveConfig(ledblinkyLayouts.lightConfig)
  }

  async saveConfig(config: LightsConfig) {
    const string = await getLightsConfigSaveString(config)
    this.session.addFileToSave({ file: config.file, string })    
  }
}

async function getLightsConfigSaveString(config: LightsConfig) {
  const promises = config.lights.map(async light => {
    const details = await firstValueFrom( light.details$ )
    const x = Math.ceil(details.x)
    const y = Math.ceil(details.y)
    const dia = Math.ceil(details.diameter)
    return `${details.name}=${x},${y},${details.colorDec},${dia}`
  })
  
  const lights = (await Promise.all(promises)).join('\n')

  const write = '[Settings]\n' + 
  objectToIniFileLines(config.settings) + '\n' +
  '[Layout]\n' + lights + '\n'

  return write
}

function objectToIniFileLines(object: Record<string, string | number>) {
  return Object.entries(object).map(([key, value]) => `${key}=${value}`).join('\n')
}