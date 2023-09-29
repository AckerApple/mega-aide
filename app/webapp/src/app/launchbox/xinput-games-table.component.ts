import { Component, EventEmitter, Input, Output } from "@angular/core";
import { animations } from "ack-angular-fx";
import { firstValueFrom } from "rxjs";
import { AdditionalApp, GameInsight, PlatformInsights } from "../session.utils";
import { XArcadeXInputProvider } from "../xarcade-xinput/XArcadeXInput.provider";
import { changePlatformGameCommandMappings } from "./changePlatformGameCommandMappings.function";

@Component({
  animations,
  selector: 'xinput-games-table',
  templateUrl: './xinput-games-table.component.html',
}) export class XinputGamesTableComponent {
  @Input() title: string = ''
  @Input() platform!: PlatformInsights
  @Input() games: GameInsight[] = []
  @Output() saveGames = new EventEmitter<GameInsight[]>()

  constructor(public xarcade: XArcadeXInputProvider) {}

  async changePlatformGameCommandMappings(
    mapping?: string | null,
  ) {
    const dir = await firstValueFrom(this.xarcade.directory$)
    changePlatformGameCommandMappings(
      this.games,
      this.platform,
      dir.path,
      mapping,
    )
    this.saveGames.emit(this.games)
  }

  async editGameMapping (game: GameInsight) {
    game.editMapping = !game.editMapping
  }
}

/** i think this is dead */
export interface GameCommandMap {
  game: GameInsight

  mapping: string
  app: AdditionalApp
  
  editMapping?:  boolean
}
