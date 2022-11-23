declare const Neutralino: any

export const path = {
  join: (...args: string[]) => {
    return args.filter(value => value.length).join('/')
  }
}

export function convertSlashes(string: string) {
  return string.replace('\\','/')
}

export function getOs() {
  return typeof get('NL_OS') === 'string' ? get('NL_OS') : undefined
}

export function get(name: string): string | undefined {
  return window[ name as any ] as any
}

export function stringToXml(string: string) {
  const parser = new DOMParser()
  const result = parser.parseFromString(string.trim(), "text/xml")
  return result
}

export async function getStorage() {
  if ( typeof Neutralino==='object' ) {
    const string = await Neutralino.storage.getData('medaaide')
    return JSON.parse(string)
  }
  
  if ( localStorage['megaaide'] ) {
    return JSON.parse(localStorage['megaaide'])
  }

  return {}
}

export function saveStorage(config: any) {
  if ( typeof Neutralino==='object' ) {
    Neutralino.storage.setData('medaaide', JSON.stringify(config))
  }

  localStorage['megaaide'] = JSON.stringify(config)
}

export interface LikeFile {
  name: string
  kind: string
  webkitRelativePath?: string
  getFile: () => File
}

export function findFolder(
  name: string,
  items: LikeFile[]
) {
  return items.find(item => item.kind === 'directory' && item.name === name)
}

export async function directoryReadToArray(
  // directory: FileSystemFileHandle[] //LikeFile[]
  directory: FileSystemDirectoryHandle //LikeFile[]
): Promise<FileSystemFileHandle[]> {
  const files: FileSystemFileHandle[] = [] // {name: string, kind: string, getFile: () => File}[] = []
  for await (const entry of directory.values()) {
    files.push(entry as any)
  }
  return files
}