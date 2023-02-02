import { Component, EventEmitter, Output } from "@angular/core";
import { DirectoryManager } from "ack-angular-components/directory-managers/DirectoryManagers";
import { SessionProvider } from "../session.provider";
import { xarcadeXinputPickerId } from "./XArcadeXInput.provider";

@Component({
  selector: 'select-xarcade-xinput-path',
  templateUrl: './select-xarcade-xinput-path.component.html',
}) export class SelectXarcadeXInputPathComponent {
  xarcadeXinputPickerId = xarcadeXinputPickerId

  @Output() change = new EventEmitter<DirectoryManager>()

  constructor(
    public session: SessionProvider,
  ) {}
}
