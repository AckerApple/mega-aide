import { stringToXml } from "./app.utilities"

export interface DirectoryManager {
  path: string
  getDirectory: (path: string, options?: FileSystemGetDirectoryOptions) => Promise<DirectoryManager>
  list: () => Promise<string[]>
  listFiles: () => Promise<DmFileReader[]>
  findFileByPath: (path: string) => Promise<DmFileReader | undefined>
  file: (fileName: string, options?: FileSystemGetFileOptions) => Promise<DmFileReader>
}

export interface DmFileReader {
  directory: DirectoryManager
  name: string
  write: (fileString: string) => Promise<void>
  readAsText: () => Promise<string>
  readAsJson: () => Promise<Object>
  readAsXml: () => Promise<Document>
  readXmlFirstElementByTagName: (tagName: string) => Promise<Element | undefined>
  readXmlElementsByTagName: (tagName: string) => Promise<Element[]>
  readXmlFirstElementContentByTagName: (tagName: string) => Promise<string | null | undefined>
}

export class BaseDmFileReader {
  async readXmlFirstElementContentByTagName(tagName: string): Promise<string | null | undefined> {
    const elements = await this.readXmlElementsByTagName(tagName)
    return elements.find(tag => tag.textContent )?.textContent
  }

  async readXmlElementsByTagName(tagName: string): Promise<Element[]> {
    const xml = await this.readAsXml()
    return new Array(...xml.getElementsByTagName(tagName) as any)
  }

  async readXmlFirstElementByTagName(tagName: string): Promise<Element | undefined> {
    const xml = await this.readAsXml()
    const elements = new Array(...xml.getElementsByTagName(tagName) as any)
    return elements.length ? elements[0] : undefined
  }

  async readAsXml(): Promise<Document> {
    const string = await this.readAsText()
    return stringToXml( string )
  }
  
  async readAsJson(): Promise<string> {
    return JSON.parse(await this.readAsText())
  }
  
  readAsText(): Promise<string> {
    throw new Error('no override provided for BaseDmFileReader.readAsText')
  }
}
