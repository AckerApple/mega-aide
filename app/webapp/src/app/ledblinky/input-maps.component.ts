import { Component } from "@angular/core";
import { animations } from "ack-angular-fx";
import { firstValueFrom, from } from "rxjs";
import { SessionProvider } from "../session.provider";
import { LedController } from "./LedBlinky.utils";


@Component({
  animations: animations,
  templateUrl: './input-maps.component.html',
}) export class InputMapsComponent {
  selectedController?: LedController

  constructor(public session: SessionProvider) {}

  async ngOnInit(){
    console.log('start')
    const results = await firstValueFrom(this.session.ledBlinky.inputsMap$)
    console.log('results', results)
  }
}
