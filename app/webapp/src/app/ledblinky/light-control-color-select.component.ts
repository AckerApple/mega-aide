import { Component, EventEmitter, Input, Output } from "@angular/core"
import { SessionProvider } from "../session.provider"
import { PlayerControl } from "./PlayerControl.class"
import { copyToClipboard } from "../app.utilities"

@Component({
  selector: 'light-control-color-select',
  templateUrl: './light-control-color-select.component.html',
}) export class LightControlColorSelectComponent {
  @Input() control!: PlayerControl
  @Output() changed = new EventEmitter<PlayerControl>()

  constructor(
    public session: SessionProvider,
  ) {}
}
