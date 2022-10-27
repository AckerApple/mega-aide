import { DirectoryManager, DmFileReader } from './DirectoryManagers'
import { path } from './app.utilities'
import { Component } from '@angular/core'
import { SessionProvider } from './session.provider'

declare const Neutralino: any

class BigBoxSetting {
  label!: string
  type!: 'wheel:opacity' | 'pointer:opacity'
  value!: number | string
  xmlElement?: Element
}

class BigBoxFileSettings {
  settings: BigBoxSetting[] = []
  
  constructor(public file: DmFileReader) {}
}

class BigBox {
  config?: any
  configXml?: Document
  viewLaunchBoxMoreInfo?: boolean
  viewBigBoxSettings?: boolean
  
  fileSettings: BigBoxFileSettings[] = []
  // deprecated
  // platformPointerEndOpacity?: number
  // platformWheelEndOpacity?: number
}

@Component({
  templateUrl: './launchbox.component.html',
})
export class LaunchBoxComponent {
  configHasChanges = false
  view?: string
  window = window as any
  neutralino = typeof Neutralino === 'object' ? true : false
  xarcadeDirectory?: DirectoryManager
  bigBox: BigBox = new BigBox()

  constructor(public session: SessionProvider) {
    if ( this.session.launchBoxDirectory ) {
      this.readDir(this.session.launchBoxDirectory)
    }
  }

  async readDir( directoryManager: DirectoryManager ) {
    this.session.launchBoxDirectory = directoryManager
    const configFilePath = 'Data/' + this.session.config.launchBox.bigBoxFileName
    const configFile = await directoryManager.findFileByPath( configFilePath )

    // attempt to set xarcade path by launch box tools path
    if ( !this.session.xarcadeDirectory ) {
      const xarcadePath = 'tools/xarcade-xinput'
      const xarcadeDir = await directoryManager.getDirectory( xarcadePath )  
      if ( xarcadeDir ) {
        this.session.xarcadeDirectory = xarcadeDir
        // notate that the link was found via LaunchBox for back and forth jumping
        this.session.launchBoxXarcadeDir = xarcadeDir
      }
    }

    if ( !configFile ) {
      return this.session.error('cannot find LaunchBox/Data/BigBoxSettings.xml file', new Error('cannot find LaunchBox/Data/BigBoxSettings.xml file'))
    }

    this.setConfigFile(configFile, directoryManager)
  }
  
  async getThemeRelativeFolderByBigBox(
    bigBoxSettingsFile: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ): Promise<string> {
    this.bigBox.config = await bigBoxSettingsFile.readAsText()
    const theme = await bigBoxSettingsFile.readXmlFirstElementContentByTagName('Theme')

    if ( !theme ) {
      throw new Error(`Could not read Theme of ${this.session.config.launchBox.bigBoxFileName}`)
    }

    return path.join('Themes', theme)
  }

  async getThemeFileByFileDirectory(
    filePath: string,
    bigBoxSettingsFile: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    const themeFolderPath = await this.getThemeRelativeFolderByBigBox(bigBoxSettingsFile, directory)
    const themeFolder = await directory.getDirectory( themeFolderPath )

  const file = await themeFolder.findFileByPath( filePath )
    if ( !file ) {
      const message = `Could not read Theme of ${themeFolder.path} ${filePath}`
      console.debug(message) // throw new Error(message)
      return
    }
    return { file, folderPath: themeFolderPath, filePath: path.join(themeFolder.path, filePath) }
  }


  async getThemeOverrideByFileDirectory(
    bigBoxSettingsFile: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    return this.getThemeFileByFileDirectory('BigBoxSettingsOverrides.xml', bigBoxSettingsFile, directory)
  }

  async setConfigFile(
    file: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    const themeRelativePath = await this.getThemeRelativeFolderByBigBox(file, directory)
    const themeDirectory = await directory.getDirectory( themeRelativePath )
    const themeResult = await themeDirectory.findFileByPath('BigBoxTheme.csproj')

    if ( !themeResult ) {
      console.warn('cannot find theme file')
      return
    }

    const itemGroups = await themeResult.readXmlElementsByTagName('ItemGroup')
    const text = await themeResult.readAsText()
    const xml = await themeResult.readAsXml()
    const includes = itemGroups.reduce((all, itemGroup) => {
      const pages = itemGroup.getElementsByTagName('Page')
      ;[...pages as any].forEach(tag => {
        all.push( tag.getAttribute('Include') )
      })
      
      return all
    },[] as string[])
   
    console.log('includes', includes)
    includes.map(async include => {
      const lookFor = 'views'
      if( include.substring(0, lookFor.length).toLowerCase() !== lookFor ) {
        return // not a views file
      }
      
      // include = '/' + include.replace('\\', '/')
      include = include.replace('\\', '/')
      console.log('include',include)
      const includeFile = await themeDirectory.findFileByPath(include)
      
      if ( !includeFile ) {
        console.debug(`Could not find file ${include} within ${themeDirectory.path}`)
        return
      }

      const includeControl = await includeFile.readXmlFirstElementByTagName('UserControl')

      if ( !includeControl ) {
        return
      }

      const style = includeControl.getAttribute('Style')
      if ( style != '{DynamicResource UserControlStyle}') {
        return // skip, this is not the file element we are looking for
      }

      const doubleAnimeFrames = [...includeControl.getElementsByTagName('DoubleAnimationUsingKeyFrames') as any]
        .filter(tag => ['FlowControl', 'Pointer'].includes(tag.getAttribute('Storyboard.TargetName')))

      if ( !doubleAnimeFrames.length ) {
        return // contains nothing of interest
      }
      

      this.setDoubleAnimationElements(doubleAnimeFrames, includeFile)
    }).filter(hasSomething => hasSomething) // only return when map had something for us

    // load BigBoxSettingsOverrides.xml
    const themeOverride = await this.getThemeOverrideByFileDirectory(file, directory)
    if ( !themeOverride ) {
      return
    }

    const { file: themeFile, folderPath: themeFolderPath } = themeOverride

    // a clue as to most important
    const listViewValue = await themeFile.readXmlFirstElementContentByTagName('PlatformsListView')
    if ( !listViewValue ) {
      const message = `Could not read PlatformsListView of BigBoxSettingsOverrides.xml`
      return console.debug(message) // throw new Error(message)
    }
  }

  setDoubleAnimationElements(
    xmlElements: Element[],
    file: DmFileReader,
  ) {
    const settingFile = new BigBoxFileSettings(file)
    
    xmlElements.forEach(xmlElement => {
      const targetProp = xmlElement.getAttribute('Storyboard.TargetProperty')
      const targetName = xmlElement.getAttribute('Storyboard.TargetName')
  
      if ( targetName === 'FlowControl' && targetProp === '(UIElement.Opacity)' ) {
        const frames = [...xmlElement.getElementsByTagName('EasingDoubleKeyFrame') as any]
        if ( frames.length ) {
          const opacity = frames[ frames.length - 1 ].getAttribute('Value')
          settingFile.settings.push({
            label: 'wheel opacity', xmlElement,
            type: 'wheel:opacity',
            value: opacity
          })
        }
      }
      
      if ( targetName === 'Pointer' && targetProp === '(Image.Opacity)' ) {
        const frames = [...xmlElement.getElementsByTagName('EasingDoubleKeyFrame') as any]
        if ( frames.length ) {
          const opacity = frames[ frames.length - 1 ].getAttribute('Value')
          settingFile.settings.push({
            label: 'pointer opacity', xmlElement,
            type: 'pointer:opacity',
            value: opacity
          })
        }
      }
    })

    // did we pickup any settings for this file?
    if ( settingFile.settings.length ) {
      this.bigBox.fileSettings.push( settingFile )
    }
  }

  saveFiles() {
    console.log('time to save...')
    this.configHasChanges = false
  }
}

function getMostParent(element: Element): Document | undefined {
  if ( element.parentNode ) {
    return getMostParent( element.parentNode as Element )
  }
  return element as any
}
