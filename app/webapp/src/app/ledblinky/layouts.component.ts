import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { firstValueFrom } from 'rxjs'
import { SessionProvider, WriteFile } from '../session.provider'
import { LightsConfig } from './LedBlinky.utils'

@Component({
  templateUrl: './layouts.component.html',
  animations,
})
export class LayoutsComponent {
  unsavedLayouts: LightsConfig[] = []

  constructor(
    public session: SessionProvider,
  ) {
    this.session.$filesSaved.subscribe(files =>
      files.forEach(file => {
        const index= this.unsavedLayouts.findIndex(lay => lay.file === file.file)
        if ( index >= 0 ) {
          this.unsavedLayouts.splice(index, 1)
        }
      })
    )
  }

  configChanged(config: LightsConfig) {
    if ( !this.unsavedLayouts.find(x => x === config) ) {
      this.unsavedLayouts.push(config)
    }
  }

  async save() {
    const promises = this.unsavedLayouts.map(async x => {
      const string = await getLightsConfigSaveString(x)
      return { file: x.file, string }
    })

    const saves: WriteFile[] = await Promise.all(promises)

    this.session.toSaveFiles.push( ...saves )
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