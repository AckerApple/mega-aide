import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'

@Component({
  templateUrl: './debug.component.html',
})
export class DebugComponent {
  constructor(public session: SessionProvider) {}
}
