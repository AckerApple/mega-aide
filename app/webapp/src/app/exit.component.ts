import { Component } from '@angular/core'

export declare const Neutralino: any

@Component({
  templateUrl: './exit.component.html',
})
export class ExitComponent {
  constructor() {
    Neutralino.app.exit()
  }
}