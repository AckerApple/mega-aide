import { path, directoryReadToArray, LikeFile } from "./app.utilities"
import { BaseDmFileReader, DirectoryManager, DmFileReader } from "./DirectoryManagers"

export class BrowserDmFileReader extends BaseDmFileReader implements DmFileReader {
  name: string
  window = window as any
  
  constructor(public file: File | FileSystemFileHandle) {
    super()
    this.name = file.name
  }

  async write(fileString: string) {
    let writableStream: any
    const likeFile: any = this.file
    const hasPermission = likeFile.queryPermission && await likeFile.queryPermission() === 'granted'

    if ( hasPermission ) {
      writableStream = await likeFile.createWritable()
    } else {
      // request where to save
      const id = this.name.replace(/[^a-zA-Z0-9]/g,'-')+'-filePicker'
      const handle = await this.window.showSaveFilePicker({
        id: id.slice(0, 32),
        suggestedName: this.name,
        types: [{
          description: 'JSON',
          accept: {
            'application/json': ['.json'],
          },
        }],
      })
      
      writableStream = await handle.createWritable()
    }


    // write our file
    await writableStream.write( fileString )

    // close the file and write the contents to disk.
    await writableStream.close()
  }

  private async getReadFile(): Promise<File> {
    const file = this.file as any
    return file.getFile ? await file.getFile() : Promise.resolve(file)
  }
  
  override readAsText(): Promise<string> {
    return new Promise(async (res, rej) => {
      try {
        var reader = new FileReader()
        const file = await this.getReadFile()
        reader.readAsText(file)
        reader.onload = () => res(reader.result as string)
      } catch (err) {
        rej(err)
      }
    })
  }
}

export class BrowserDirectoryManager implements DirectoryManager {
  constructor(
    public path: string,
    public files: FileSystemFileHandle[], // LikeFile[],
    public directoryHandler: any,
  ) {}

  async list(): Promise<string[]> {
    return this.files.map(file => file.name)
  }

  /*
  private getSystemFile(
    file: FileSystemFileHandle
  ): Promise<FileSystemFileHandle> {
    return Promise.resolve(file)
    
    // load browser file WITH connected permissions
    //return this.directoryHandler.getFileHandle(file.name)
    
    // load browser file but with no connected permissions
    // return file.getFile ? await file.getFile() : file as any
  }*/
  
  async listFiles(): Promise<DmFileReader[]> {
    return this.files.filter(file => file.kind === 'file')
      .map(file => new BrowserDmFileReader(file))
    /*
    const filePromises: Promise<FileSystemFileHandle>[] = this.files
      .filter(file => file.kind === 'file')
      .map(async file => this.getSystemFile(file))
    
    return (await Promise.all(filePromises))
      .map(file => new BrowserDmFileReader(file))
    */
  }

  async getDirectory(newPath: string) {
    const newPathArray = newPath.split('/')
    const dir = await newPathArray.reduce(async (last,current) => {
      const next = await last
      const newHandle = next.getDirectoryHandle(current)
      return newHandle
    }, Promise.resolve(this.directoryHandler))
    const files: FileSystemFileHandle[] = await directoryReadToArray(dir)
    const fullNewPath = path.join(this.path, newPath)
    const newDir = new BrowserDirectoryManager(
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
    // const file = await this.getSystemFile(likeFile)
    
    return new BrowserDmFileReader(likeFile)
  }
}
