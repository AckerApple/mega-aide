import { Component } from '@angular/core'
import { openAnchor } from '../app.component'
import { changelog, debugReport, exit, inputs } from '../app.routing.module'
import { launchBox } from '../launchbox/launchbox.routing.module'
import { ledblinky } from '../ledblinky.routing.module'
import { SessionProvider } from '../session.provider'

@Component({
  templateUrl: './menu.component.html',
})
export class MenuComponent {
  openAnchor = openAnchor
  menu = [ launchBox, inputs, ledblinky, changelog, debugReport ]

  constructor(public session: SessionProvider) {
    if ( session.os ) {
      this.menu.push(exit)
    }
  }
}