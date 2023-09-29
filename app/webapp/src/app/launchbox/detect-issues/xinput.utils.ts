
export function isPathKillXinput(path: string) {
  if ( (path.includes('xarcade') || path.includes('xinput')) && path.includes('kill') ) {
    return true
  }

  return false
}

export function isPathXinput(path: string) {
  if ( path.includes('XArcade XInput.exe') ) {
    return true
  }

  return false
}
