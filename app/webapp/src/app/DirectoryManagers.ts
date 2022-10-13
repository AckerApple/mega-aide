import { convertSlashes, directoryReadToArray, findFolder, LikeFile, path, stringToXml } from "./app.utilities"

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
  readAsText: () => Promise<string>
  readAsJson: () => Promise<Object>
  readAsXml: () => Promise<Document>
  readXmlFirstElementByTagName: (tagName: string) => Promise<Element | undefined>
  readXmlElementsByTagName: (tagName: string) => Promise<Element[]>
  readXmlFirstElementContentByTagName: (tagName: string) => Promise<string | null | undefined>
}

class BaseDmFileReader {
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

export class BrowserDmFileReader extends BaseDmFileReader implements DmFileReader {
  name: string
  
  constructor(public file: File) {
    super()
    this.name = file.name
  }
  
  override readAsText(): Promise<string> {
    return new Promise((res, rej) => {
      try {
        var reader = new FileReader()
        reader.readAsText(this.file)
        reader.onload = () => res(reader.result as string)
      } catch (err) {
        rej(err)
      }
    })
  }
}

export class SafariDirectoryManager implements DirectoryManager {
  constructor(
    public path: string = '',
    public files: File[],
  ) {}

  async getDirectory(path: string) {
    const nextItems = this.files.filter(file => {
      const relative = getWebkitPathRelativeTo(file, this.path)
      return relative.substring(0, path.length).toLowerCase() === path.toLowerCase()
    })
    return new SafariDirectoryManager(path, nextItems)
  }

  getRelativeItems() {
    return this.files.filter(file => {
      const relative = getWebkitPathRelativeTo(file, this.path)
      return relative.split('/').length === 1 // lives within same directory
    })
  }

  async list(): Promise<string[]> {
    return this.getRelativeItems().map(file => file.name)
  }

  async listFiles(): Promise<DmFileReader[]> {
    return this.getRelativeItems().map(file => new BrowserDmFileReader(file))
  }

  async findFileByPath (filePath: string ): Promise<BrowserDmFileReader | undefined> {
    if ( !this.files.length ) {
      return
    }

    // safari include the parent folder name so we need to prepend it to the file search
    const rootName = this.files[0].webkitRelativePath.split('/').shift() as string
    filePath = path.join(rootName, this.path, filePath)
    
    // safari just gives us every files upfront, find within that (huge) array
    const file = this.files.find(file => file.webkitRelativePath === filePath) as File | undefined
    return file ? new BrowserDmFileReader(file) : undefined
  }
}

export class ChromeDirectoryManager implements DirectoryManager {
  constructor(
    public path: string,
    public files: LikeFile[],
    public directoryHandler: any,
  ) {}

  async list(): Promise<string[]> {
    return this.files.map(file => file.name)
  }
  
  async listFiles(): Promise<DmFileReader[]> {
    const filePromises: Promise<File>[] = this.files
      .filter(file => file.kind === 'file')
      .map(async file => {
        return file.getFile ? await file.getFile() : file as any
      })
    
    return (await Promise.all(filePromises))
      .map(file => new BrowserDmFileReader(file))
  }

  async getDirectory(newPath: string) {
    const newPathArray = newPath.split('/')
    const dir = await newPathArray.reduce(async (last,current) => {
      const next = await last
      const newHandle = next.getDirectoryHandle(current)
      return newHandle
    }, Promise.resolve(this.directoryHandler))
    const files = await directoryReadToArray(dir)
    const fullNewPath = path.join(this.path, newPath)
    const newDir = new ChromeDirectoryManager(
      fullNewPath,
      files,
      dir
    )
    return newDir
  }

  async findFileByPath (
    path: string,
    directoryHandler: any = this.directoryHandler,
  ): Promise<BrowserDmFileReader | undefined> {
    const pathSplit = path.split('/')
    const fileName = pathSplit[ pathSplit.length-1 ]
    if ( !this.files.length ) {
      return
    }

    // chrome we dig through the first selected directory and search the subs
    if ( pathSplit.length > 1 ) {
      const lastParent = pathSplit.shift() as string // remove index 0 of lastParent/firstParent/file.xyz
      const newHandler = await directoryHandler.getDirectoryHandle( lastParent )
      
      if ( !newHandler ) {
        console.debug('no matching upper folder', lastParent, directoryHandler)
        return
      }
      
      return this.findFileByPath(pathSplit.join('/'), newHandler)
    }
    
    let files = this.files
    if ( directoryHandler ) {
      files = await directoryReadToArray(directoryHandler)
    }
    
    const likeFile = files.find(file => file.name === fileName)
    if ( !likeFile ) {
      return
    }
    
    // when found, convert to File
    const file: File = await likeFile.getFile()
    
    return new BrowserDmFileReader(file)
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

function getWebkitPathRelativeTo(file: File, path: string) {
  const relativeSplit = file.webkitRelativePath.split('/')
  relativeSplit.shift() // remove the first notation on safari results
  if ( path !== '' ) {
    let splitCount = path.split('/').length
    while (splitCount) {
      relativeSplit.shift() // remove starting notations on safari results
      --splitCount
    }
  }
  return relativeSplit.join('/')
}