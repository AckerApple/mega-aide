import { convertSlashes, path, stringToXml } from "./app.utilities"

declare const Neutralino: any
const fs = typeof Neutralino === 'object' ? Neutralino.filesystem : {}

export interface DirectoryManager {
  path: string
  getDirectory: (path: string) => Promise<DirectoryManager>
  findFileByPath: (path: string) => Promise<DmFileReader | undefined>
  list: () => Promise<string[]>
  listFiles: () => Promise<DmFileReader[]>
}

export interface DmFileReader {
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

export class NeutralinoDmFileReader extends BaseDmFileReader implements DmFileReader {
  name: string
  
  constructor(public filePath: string) {
    super()
    this.name = filePath.split('/').pop() as string
  }

  override readAsText(): Promise<string> {
    return fs.readFile(this.filePath) // .toString()
  }

  async write(fileString: string) {
    return fs.writeFile(this.filePath, fileString)
  }
}

export class NeutralinoDirectoryManager implements DirectoryManager {
  constructor(public path: string) {
  }

  async list(): Promise<string[]> {
    const reads: {entry: 'FILE' | 'DIRECTORY', type: string}[] = await Neutralino.filesystem.readDirectory( this.path )
    return reads.filter(read => !['.','..'].includes(read.entry)).map(read => read.entry)
  }

  async listFiles(): Promise<DmFileReader[]> {
    const reads: {entry: string, type: 'FILE' | 'DIRECTORY'}[] = await Neutralino.filesystem.readDirectory( this.path )
    return reads.filter(read => !['.','..'].includes(read.entry) && read.type !== 'DIRECTORY')
      .map(read => new NeutralinoDmFileReader(this.getFullPath(read.entry)))
  }

  async getDirectory(newPath: string) {
    return new NeutralinoDirectoryManager( path.join(this.path, newPath) )
  }

  async findFileByPath (
    filePath: string,
  ): Promise<NeutralinoDmFileReader> {
    const fullFilePath = this.getFullPath(filePath)
    return new NeutralinoDmFileReader(fullFilePath)
  }

  getFullPath(itemPath: string) {
    let fullFilePath = path.join(this.path, itemPath)
    return convertSlashes(fullFilePath)
  }
}
