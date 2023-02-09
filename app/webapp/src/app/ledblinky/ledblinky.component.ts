import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { inputMaps, layouts, ledblinkyControls } from '../ledblinky.routing.module'

@Component({
  templateUrl: './ledblinky.component.html',
  animations,
})
export class LEDBlinkyComponent {
  menu = [
    inputMaps, ledblinkyControls, layouts,
  ]

  constructor(
    public session: SessionProvider,
  ) {}
}
