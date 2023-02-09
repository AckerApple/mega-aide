import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
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

  save() {
    const saves: WriteFile[] = this.unsavedLayouts.map(x => {
      const string = getLightsConfigSaveString(x)
      return { file: x.file, string }
    })

    this.session.toSaveFiles.push( ...saves )
  }
}

function getLightsConfigSaveString(config: LightsConfig) {
  const lights = config.lights.map(light => {
    const x = Math.ceil(light.details.x)
    const y = Math.ceil(light.details.y)
    const dia = Math.ceil(light.details.diameter)
    return `${light.details.name}=${x},${y},${light.details.colorDec},${dia}`
  }
  ).join('\n')

  const write = '[Settings]\n' + 
  objectToIniFileLines(config.settings) + '\n' +
  '[Layout]\n' + lights + '\n'

  return write
}

function objectToIniFileLines(object: Record<string, string | number>) {
  return Object.entries(object).map(([key, value]) => `${key}=${value}`).join('\n')
}