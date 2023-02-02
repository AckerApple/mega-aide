import { DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { path } from 'ack-angular-components'

export class BigBoxFileSettings {
  settings: BigBoxSetting[] = []
  
  constructor(public file: DmFileReader) {}
  
  async getThemeName(): Promise<string | undefined> {
    await this.file.readAsText()
    return this.file.readXmlFirstElementContentByTagName('Theme') as Promise<string | undefined>
  }

    
  async getThemeRelativeFolder(): Promise<string> {
    const theme = await new BigBoxFileSettings(this.file).getThemeName()
    if ( !theme ) {
      throw new Error(`Could not read Theme of ${this.file.name}`)
    }

    return path.join('Themes', theme)
  }
}

export class BigBoxSetting {
  label!: string
  type!: 'wheel:opacity' | 'pointer:opacity'
  value!: number | string
  xmlElement?: Element
}
