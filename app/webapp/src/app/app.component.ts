import { Component } from '@angular/core'
import packageJson from '../../package.json'
import { SessionProvider } from './session.provider'

export declare const Neutralino: any

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  version = packageJson.version
  openAnchor = openAnchor
  window = window as any // for in-template check of available functionality AND for its any typing in `this` component
  title = 'webapp'

  constructor(public session: SessionProvider) {}
}

export function openAnchor(event: Event) {
  if ( typeof Neutralino === 'object' ) {
    const anchor = event.target
    const url = (anchor as Element).getAttribute('href')
    Neutralino.os.open(url)
    event.preventDefault() // do not allow app window to be stolen
  }
}