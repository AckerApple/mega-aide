import { DirectoryManager, DmFileReader } from "./DirectoryManagers"
import { path } from "./app.utilities"
import { BrowserDmFileReader } from "./BrowserDirectoryManagers"

export class SafariDirectoryManager implements DirectoryManager {
  constructor(
    public path: string = '',
    public files: File[],
  ) {}

  async getDirectory(path: string) {
    // safari gives you all items up front
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
    return this.getRelativeItems().map(file => new BrowserDmFileReader(file, this))
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
    return file ? new BrowserDmFileReader(file, this) : undefined
  }

  async file(fileName: string, _options?: FileSystemGetFileOptions) {
    const findFile = await this.findFileByPath(fileName)

    if ( findFile ) {
      return findFile
    }

    const superFile = new BrowserDmFileReader(new File([], fileName), this)
    return Promise.resolve(superFile)
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