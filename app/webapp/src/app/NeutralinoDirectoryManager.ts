import { convertSlashes, path } from "./app.utilities"
import { BaseDmFileReader, DirectoryManager, DmFileReader } from "./DirectoryManagers"

declare const Neutralino: any
const fs = typeof Neutralino === 'object' ? Neutralino.filesystem : {}

export class NeutralinoDmFileReader extends BaseDmFileReader implements DmFileReader {
  name: string
  
  constructor(
    public filePath: string,
    public directory: NeutralinoDirectoryManager,
  ) {
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
  constructor(
    public path: string,
  ) {}

  async list(): Promise<string[]> {
    const reads: {entry: 'FILE' | 'DIRECTORY', type: string}[] = await Neutralino.filesystem.readDirectory( this.path )
    return reads.filter(read => !['.','..'].includes(read.entry)).map(read => read.entry)
  }

  async listFiles(): Promise<DmFileReader[]> {
    const reads: {entry: string, type: 'FILE' | 'DIRECTORY'}[] = await Neutralino.filesystem.readDirectory( this.path )
    return reads.filter(read => !['.','..'].includes(read.entry) && read.type !== 'DIRECTORY')
      .map(read => new NeutralinoDmFileReader(this.getFullPath(read.entry), this))
  }

  async getDirectory(newPath: string) {
    return new NeutralinoDirectoryManager( path.join(this.path, newPath) )
  }

  async findFileByPath (
    filePath: string,
  ): Promise<NeutralinoDmFileReader> {
    const fullFilePath = this.getFullPath(filePath)
    return new NeutralinoDmFileReader(fullFilePath, this)
  }

  file(fileName: string, _options?: FileSystemGetFileOptions) {
    return this.findFileByPath(fileName)
  }

  getFullPath(itemPath: string) {
    let fullFilePath = path.join(this.path, itemPath)
    return convertSlashes(fullFilePath)
  }
}
