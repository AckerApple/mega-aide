import { Component } from '@angular/core'
import { SessionProvider } from '../session.provider'

@Component({
  templateUrl: './platforms.component.html'
})
export class PlatformsComponent {  
  constructor(
    public session: SessionProvider,
  ) {}
}
