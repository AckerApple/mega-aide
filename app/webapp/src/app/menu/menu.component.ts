import { Component } from '@angular/core'
import { backups, changelog, debugReport, exit, inputs } from '../app.routing.module'
import { launchBox } from '../launchbox/launchbox.routing.module'
import { ledblinky } from '../ledblinky.routing.module'
import { SessionProvider } from '../session.provider'
import { openAnchor } from '../session.utils'

@Component({
  templateUrl: './menu.component.html',
})
export class MenuComponent {
  openAnchor = openAnchor
  menu = [ launchBox, inputs, ledblinky, backups, changelog, debugReport ]

  constructor(public session: SessionProvider) {
    if ( session.os ) {
      this.menu.push(exit)
    }
  }
}