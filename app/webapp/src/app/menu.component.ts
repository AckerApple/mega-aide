import { Component } from '@angular/core'
import { openAnchor } from './app.component'
import { debugReport, exit, inputs, launchBox } from './app.routing.module'
import { SessionProvider } from './session.provider'

@Component({
  templateUrl: './menu.component.html',
})
export class MenuComponent {
  openAnchor = openAnchor
  menu = [ launchBox, debugReport, inputs ]

  constructor(public session: SessionProvider) {
    if ( session.os ) {
      this.menu.push(exit)
    }
  }
}