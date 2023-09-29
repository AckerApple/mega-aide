import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { inputMaps, layouts, ledblinkyControls } from '../ledblinky.routing.module'
import { backups } from './routing.backups'

@Component({
  templateUrl: './ledblinky.component.html',
  animations,
})
export class LEDBlinkyComponent {
  menu = [
    inputMaps, ledblinkyControls, layouts, backups,
  ]

  constructor(public session: SessionProvider) {}
}
