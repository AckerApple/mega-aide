import { Component, EventEmitter, Input, Output } from '@angular/core'
import { XArcadeXInputProvider } from '../xarcade-xinput/XArcadeXInput.provider'

@Component({
  selector: 'xinput-map-select',
  templateUrl: './xinput-map-select.component.html',
})
export class XinputMapSelectComponent {
  @Input() model!: string
  @Output() modelChange: EventEmitter<string> = new EventEmitter()
  
  constructor(
    public xarcade: XArcadeXInputProvider,
  ) {
  }
  
  ngOnInit(){
    this.xarcade.loadMappings()
  }
}