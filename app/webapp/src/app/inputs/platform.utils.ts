import { Control } from "../platforms"

export function hexToRgb(hex: string): [number, number, number] {
  const result: any = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || [0,0,0,0]
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ]
}

export interface PlayerMap {
  index: number
  showMap?: boolean
  lastDrag?: LastDrag
  inFx?: number | boolean
  viewPlayerMap?: boolean
}

export interface PlayersMap {
  [playerIndex: number]: PlayerMap
}

export class LastDrag {
  // event!: DragEvent
  control!: Control
  startOffsetY!: number
  startOffsetX!: number
}

export interface Remap {
  keyName: string // instead use this of default string
  keyCode: number // instead use this default number
  label: string // match by name here 'Start' === 'start'
}
