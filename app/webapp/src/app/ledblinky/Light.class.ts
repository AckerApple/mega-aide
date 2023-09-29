import { BehaviorSubject, Observable, map } from "rxjs"
import { intToHex } from "./LedBlinky.utils"
import { hexToRgb } from "../inputs/platform.utils"

export interface LightDetails {
  name: string // ie: "P1START" or "P1COIN" or "P1B1"
  x: number
  y: number
  colorDec: number
  diameter: number
}

export class Light {
  constructor(
    public details: LightDetails
  ) {
    this.colorDec$.next(details.colorDec)
  }
  
  startDragX?: number
  startDragY?: number

  details$: Observable<LightDetails> = new BehaviorSubject<LightDetails>(this.details)

  colorDec$ = new BehaviorSubject<number>(0)
  cssColor$ = this.colorDec$.pipe(
    map(colorDec => intToHex(colorDec))
  )
  rgbArray$: Observable<[number, number, number]> = this.cssColor$.pipe(
    map(css => hexToRgb(css))
  )

  updateToCssColor(cssColor: string) {
    this.details

    const noHashColor = cssColor.replace('#','')
    this.details.colorDec = parseInt(noHashColor, 16)
    this.updateToColorDec(this.details.colorDec)
  }

  updateToColorDec(dec: number) {
    this.colorDec$.next(dec)
  }
}
