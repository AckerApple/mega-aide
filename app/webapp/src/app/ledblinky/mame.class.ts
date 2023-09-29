import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers"
import { DmFileReader } from "ack-angular-components/directory-managers/DmFileReader"
import { SessionProvider } from "../session.provider"
import { elmAttributesToObject, getElementsByTagName } from "./element.utils"

export class Mame {
  directory?: DirectoryManager
  
  pickerId = 'mamePicker'

  constructor(public session: SessionProvider) {}

  /** list cfg/*.cfg files */
  async getGameConfigFiles(): Promise<
    {files: DmFileReader[], default?: DmFileReader} | undefined
  > {
    if ( !this.directory ) {
      return
    }

    const folderName = 'cfg'
    const cfgDir = await this.directory.findDirectory(folderName)
    
    if ( !cfgDir ) {
      this.session.warn(`Cannot load directory ${this.directory.path} ${folderName}`)
      return
    }

    const files = await cfgDir.getFiles()
    const configFiles = files.filter(file => file.name.search(/\.cfg$/) >= 0)
    return {
      files: configFiles,
      default: getDefaultConfigFrom(configFiles)
    }
  }
}


function getDefaultConfigFrom(configFiles: DmFileReader[]) {
  return configFiles.find(x => x.name.toLowerCase() === 'default.cfg')
}

interface MamePortDetails {
  type: string
  [index: string]: string | null
}

export interface MamePort {
  element: Element
  details: MamePortDetails
  newseqs: {
    element: Element
    details: {[index: string]: string | null}
    inputCodes: string[]
  }[]
}

export async function mameGameConfigFileToPorts(
  file: DmFileReader
): Promise<MamePort[]> {
  const defaultConfigXml = await file.readAsXml()
  return getElementsByTagName(defaultConfigXml, 'port')
    .map(port => {
      return {
        element: port,
        details: elmAttributesToObject(port) as MamePortDetails,
        newseqs: getElementsByTagName(port, 'newseq').map(newseq => {
          return {
            element: newseq,
            details: elmAttributesToObject(newseq),
            inputCodes: newseq.innerHTML.trim().split(' OR ')
          }
        })
      }
    })
}

export interface MamePortMap {
  type: string, // P1_BUTTON1
  inputCodes: string[] // ['KEYCODE_LCONTROL','MOUSECODE_1_BUTTON1','GUNCODE_3_BUTTON1'
}

export function mapMamePorts(
  ports: MamePort[]
): MamePortMap[] {
  return ports.map(port => {
    return {
      type: port.details.type,
      inputCodes: port.newseqs.reduce((all, now) => {
        all.push( ...now.inputCodes )
        return all
      }, [] as string[])
    }
  })
}