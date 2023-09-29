import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core"
import { SessionProvider } from "../session.provider"

@Component({
  selector: 'color-inputs',
  templateUrl: './color-inputs.component.html',
}) export class ColorInputsComponent {
  @Input() cssColor!: string | null // control.cssColor$ | async
  @Input() color?: string | null // details.color
  @Input() allowNameSelect = true
  @Output() colorNameChange = new EventEmitter<string>()
  @Output() modelChange = new EventEmitter<string>()
  @Output() paste =  new EventEmitter<string>()

  colorNums: (number | '')[] = []
  view?: '' | 'numbers'

  constructor(public session: SessionProvider) {}

  ngOnChanges( changes:SimpleChanges ){
    if ( changes['color'] && this.color ) {
      this.applyColorNum()
    }
  }

  applyColorNum() {
    this.colorNums.length = 0

    if ( !this.color ) {
      return
    }

    const colorSplit = this.color.split(',')
    this.colorNums = colorSplit.map(num => isNaN(Number(num)) ? '' : Number(num))
  }

  updateColorNumber(elements: HTMLInputElement[]) {
    const inputs = new Array(...elements)
    const numbers = inputs.map(input => input.value) as [string, string, string]
    const result = numbers.join(',')
    this.colorNameChange.emit(result)
  }

  modelTimeout?: any
  debounceModelChange(value: string) {
    // clear any previous timeout
    if ( this.modelTimeout ) {
      clearTimeout(this.modelTimeout)
    }

    // wait and then run code
    this.modelTimeout = setTimeout(() => {
      this.modelChange.emit(this.cssColor=value)
    }, 100)
  }
}
