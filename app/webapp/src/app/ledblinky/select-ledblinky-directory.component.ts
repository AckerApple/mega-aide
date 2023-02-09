import { Component } from "@angular/core"
import { animations } from "ack-angular-fx"
import { SessionProvider } from "../session.provider"


@Component({
  animations: animations,
  selector: 'select-ledblinky-directory',
  templateUrl: './select-ledblinky-directory.component.html',
}) export class SelectLedblinkyDirectoryComponent {
  showSelectLaunchBox?: boolean
  
  constructor(public session: SessionProvider) {}
}
