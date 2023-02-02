
export class PlatformMap {
  url!: string
  label!: string
  players!: Control[][] // 1, 2, 3, 4
}

export class PlatformsMapping {
  images!: PlatformMap[]
}

export class Control {
  label?: string
  keyCode?: number // keyboard key number
  keyName?: string // keyboard key name (aka javascript event.code)
  shape?: 'square' | 'circle'
  emoji?: string
  color?: number[] // [number, number, number]

  // gamepads
  type?: 'button' | 'axis'
  gamepadButton?: number | string
  gamepadCode?: string // it's either the gamepadButton || axis+direction
  gamepadAxis?: 'LeftStickX' | 'LeftStickY' | 'RightStickX' | 'RightStickY'
  gamepadDirection?: 1 | -1 // (up or right) | (down or left)

  // geometry
  x!: number // percent
  y!: number // percent
  width?: number // percent
  height?: number // percent
}
