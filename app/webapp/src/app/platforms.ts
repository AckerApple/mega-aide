
export class PlatformMap {
  url!: string
  label!: string
  players!: Control[][] // 1, 2, 3, 4
}

export class PlatformsMapping {
  images!: PlatformMap[]
}

export class Control {
  // index!: number
  keyCode?: number // keyboard key number
  keyName?: string // keyboard key name (aka javascript event.code)
  shape?: 'square' | 'circle'
  emoji?: string
  label?: string
  color?: number[] // [number, number, number]

  // gamepads
  type?: 'button' | 'axis'
  gamepadCode?: number | string
  gamepadAxis?: string // +2 === positive movement in axis index 2

  // geometry
  x!: number // percent
  y!: number // percent
  width?: number // percent
  height?: number // percent
}
