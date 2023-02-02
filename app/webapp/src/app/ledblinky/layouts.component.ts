import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { SessionProvider } from '../session.provider'

@Component({
  templateUrl: './layouts.component.html',
  animations,
})
export class LayoutsComponent {
  constructor(
    public session: SessionProvider,
  ) {}
}
