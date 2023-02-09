import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'
import { BigBoxFileSettings } from './BigBoxFileSettings.class'
import { xmlDocToString } from '../xml.functions'
import { DirectoryManager, DmFileReader } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { path } from 'ack-angular-components'
import { Subscription } from 'rxjs'

@Component({
  templateUrl: './ThemeSettings.component.html',
})
export class ThemeSettingsComponent {
  bigBox = new BigBox()
  configHasChanges = false
  subs = new Subscription()

  constructor(
    public session: SessionProvider,
  ) {
    this.subs.add(
      this.session.launchBox.directoryChange.subscribe(dir => {
        if ( !dir ) {
          return
        }
        
        this.readDir(dir)
      })
    )
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }

  ngOnInit(){
    const directory = this.session.launchBox.directoryChange.getValue()
    if ( !directory ) {
      return
    }
    this.readDir(directory)
  }

  async readDir( directoryManager: DirectoryManager ) {
    const configFilePath = 'Data/' + this.session.config.launchBox.bigBoxFileName
    const configFile = await directoryManager.findFileByPath( configFilePath )

    if ( !configFile ) {
      return this.session.error('cannot find LaunchBox/Data/BigBoxSettings.xml file', new Error('cannot find LaunchBox/Data/BigBoxSettings.xml file'))
    }

    this.setConfigFile(configFile, directoryManager)
  }

  async setConfigFile(
    file: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    this.bigBox.config = await file.readAsText()
    const fileSettings = await new BigBoxFileSettings(file)
    const themeRelativePath = await fileSettings.getThemeRelativeFolder()
    const themeDirectory = await directory.getDirectory( themeRelativePath )
    const themeResult = await themeDirectory.findFileByPath('BigBoxTheme.csproj')
    this.bigBox.themeName = await fileSettings.getThemeName()

    if ( !themeResult ) {
      this.session.warn('cannot find theme file')
      return
    }

    const itemGroups = await themeResult.readXmlElementsByTagName('ItemGroup')
    // const text = await themeResult.readAsText()
    // const xml = await themeResult.readAsXml()

    // get every <Page Include="...file-ref..."> from ${themeName}/BigBoxTheme.csproj
    const includes = itemGroups.reduce((all, itemGroup) => {
      // find all <Page> elements
      const pages = itemGroup.getElementsByTagName('Page')
      
      // read attributes.Include value of all
      ;[...pages as any].forEach(tag => {
        all.push( tag.getAttribute('Include') )
      })
      
      return all
    },[] as string[])

    // loop all includes only looking for paths that start with views
    const viewIncludes = includes.filter(include => {
      const lookFor = 'views'
      if( include.substring(0, lookFor.length).toLowerCase() !== lookFor ) {
        return // not a views file
      }

      return include
    })
    
    // find and read each listed file detecting if its a target file
    const validViewIncludes = viewIncludes.map(async include => {
      // include = '/' + include.replace('\\', '/')
      include = include.replace('\\', '/')
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

      return {includeControl, includeFile}
    })
    
    // wait for all files to be read and then remove invalids
    const readyViewIncludes = (await Promise.all(validViewIncludes)).filter(x => x) as {includeControl: Element, includeFile: DmFileReader}[]
    
    // review valid files and now look for target settings
    readyViewIncludes.forEach(({includeControl, includeFile}) => {
      const doubleAnimeFrames = [...includeControl.getElementsByTagName('DoubleAnimationUsingKeyFrames') as any]
        .filter(tag => ['FlowControl', 'Pointer'].includes(tag.getAttribute('Storyboard.TargetName')))

      if ( !doubleAnimeFrames.length ) {
        return // contains nothing of interest
      }

      this.setDoubleAnimationElements(doubleAnimeFrames, includeFile)
    })

    // load BigBoxSettingsOverrides.xml
    const themeOverride = await this.getThemeOverrideByFileDirectory(file, directory)
    if ( !themeOverride ) {
      return
    }

    const { file: themeFile } = themeOverride

    // a clue as to most important
    const platformViewValue = await themeFile.readXmlFirstElementContentByTagName('PlatformsListView')
    if ( platformViewValue ) {
      this.bigBox.platformListView = platformViewValue
    }

    // a clue as to most important
    const gameViewValue = await themeFile.readXmlFirstElementContentByTagName('GamesListView')
    if ( gameViewValue ) {
      this.bigBox.gameListView = gameViewValue
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
          const frame = frames[ frames.length - 1 ]
          const opacity = frame.getAttribute('Value')
          settingFile.settings.push({
            label: 'wheel opacity', xmlElement: frame,
            type: 'wheel:opacity',
            value: opacity
          })
        }
      }
      
      if ( targetName === 'Pointer' && targetProp === '(Image.Opacity)' ) {
        const frames = [...xmlElement.getElementsByTagName('EasingDoubleKeyFrame') as any]
        if ( frames.length ) {
          const frame = frames[ frames.length - 1 ]
          const opacity = frame.getAttribute('Value')
          settingFile.settings.push({
            label: 'pointer opacity', xmlElement: frame,
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

  async getThemeOverrideByFileDirectory(
    bigBoxSettingsFile: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    return this.getThemeFileByFileDirectory('BigBoxSettingsOverrides.xml', bigBoxSettingsFile, directory)
  }

  async getThemeFileByFileDirectory(
    filePath: string,
    bigBoxSettingsFile: DmFileReader, // BigBoxSettings.xml
    directory: DirectoryManager,
  ) {
    const themeFolderPath = await new BigBoxFileSettings(bigBoxSettingsFile).getThemeRelativeFolder()
    const themeFolder = await directory.getDirectory( themeFolderPath )
    const file = await themeFolder.findFileByPath( filePath )
    if ( !file ) {
      const message = `Could not read Theme of ${themeFolder.path} ${filePath}`
      console.debug(message) // throw new Error(message)
      return
    }
    return { file, folderPath: themeFolderPath, filePath: path.join(themeFolder.path, filePath) }
  }

  async saveFile(fileConfig: BigBoxFileSettings) {    
    if ( !fileConfig.settings.length ) {
      this.session.warn('no settings to write')
      return
    }

    // report all values
    fileConfig.settings.forEach(setting => {
      const element = setting.xmlElement

      setting.xmlElement?.setAttribute('Value', setting.value as string)
      
      if ( !element ) {
        return
      }
      
      return element
    })

    const xmlElement = fileConfig.settings[0]
    const parent = getMostParent(xmlElement.xmlElement as Element) as Document
    const xmlString = xmlDocToString(parent)

    this.session.toSaveFiles = [{
      file: fileConfig.file,
      string: xmlString,
    }]
  }
}


export class BigBox {
  config?: any
  configXml?: Document
  viewBigBoxSettings?: boolean
  fileSettings: BigBoxFileSettings[] = []
  
  // actual settings
  themeName?: string
  platformListView?: string // PlatformWheel2
  gameListView?: string // VerticalWheel4
  
  // deprecated
  // platformPointerEndOpacity?: number
  // platformWheelEndOpacity?: number
}

export function getMostParent(element: Element): Document | undefined {
  if ( element.parentNode ) {
    return getMostParent( element.parentNode as Element )
  }
  return element as any
}
