declare const Neutralino: any

export function getOs() {
  return typeof get('NL_OS') === 'string' ? get('NL_OS') : undefined
}

export function get(name: string): string | undefined {
  return window[ name as any ] as any
}

export async function getStorage() {
  if ( typeof Neutralino==='object' ) {
    const string = await Neutralino.storage.getData('megaaide')
    return JSON.parse(string)
  }
  
  if ( localStorage['megaaide'] ) {
    const data = JSON.parse(localStorage['megaaide'])
    console.info('💿 Previous local storage found', data)
    return data
  }

  console.warn('💿 No previous local storage found')
  return {}
}

export function saveStorage(config: any) {
  if ( typeof Neutralino==='object' ) {
    Neutralino.storage.setData('megaaide', JSON.stringify(config))
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

export function copyToClipboard(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Append the textarea to the document
  document.body.appendChild(textArea);

  // Select the text in the textarea
  textArea.select();
  textArea.setSelectionRange(0, 99999); // For mobile devices

  // Copy the selected text to the clipboard
  document.execCommand("copy");

  // Remove the textarea from the document
  document.body.removeChild(textArea)
}