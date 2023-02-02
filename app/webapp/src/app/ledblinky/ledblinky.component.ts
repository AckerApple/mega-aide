import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { SessionProvider } from '../session.provider'
import { layouts, ledblinkyControls } from '../ledblinky.routing.module'

@Component({
  templateUrl: './ledblinky.component.html',
  animations,
})
export class LEDBlinkyComponent {
  menu = [
    ledblinkyControls, layouts,
  ]

  constructor(
    public session: SessionProvider,
  ) {}
}
