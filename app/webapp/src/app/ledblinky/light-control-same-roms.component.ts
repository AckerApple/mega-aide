import { Component, EventEmitter, Input, Output } from "@angular/core";
import { EmulatorRom, LightAndControl } from "./LightAndControl.interface";
import { PlayerControl } from "./PlayerControl.class";

@Component({
  selector: 'light-control-same-roms',
  templateUrl: './light-control-same-roms.component.html',
}) export class LightControlSameRomsComponent {
  @Input() lightControl!: LightAndControl
  @Output() useChange = new EventEmitter<PlayerControl>()

  use(game: EmulatorRom) {
    const player = this.lightControl.player
    
    this.lightControl.control.xml.addDetails({
      color: game.playerControl.xml.details.color,
      name: game.playerControl.xml.details.name,
      voice: game.playerControl.xml.details.voice,
      inputCodes: game.playerControl.xml.details.inputCodes
    })

    if ( player ) {
      player.playerIndex = game.playerIndex;
      player.updated$.next(null)
    }
    this.useChange.emit(this.lightControl.control)
  }
}