import { Component } from '@angular/core'
import packageJson from '../../package.json'
import { animations } from "ack-angular-fx"
import { SessionProvider } from './session.provider'
import { openAnchor } from './session.utils'

declare const Neutralino: any

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations,
})
export class AppComponent {
  inFx = false
  version = packageJson.version
  openAnchor = openAnchor
  window = window as any // for in-template check of available functionality AND for its any typing in `this` component
  title = 'webapp'

  constructor(
    public session: SessionProvider,
  ) {}

  close() {
    Neutralino.app.exit()
  }
}
