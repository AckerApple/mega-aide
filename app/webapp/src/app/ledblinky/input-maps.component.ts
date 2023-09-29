import { Component } from "@angular/core"
import { animations } from "ack-angular-fx"
import { Subscription, firstValueFrom } from "rxjs"
import { SessionProvider } from "../session.provider"
import { LedController } from "./LEDController.class"
import { inputMaps } from "../ledblinky.routing.module"
import { InputsMap } from "./LedBlinky.utils"
import { Port } from "./LedPort.class"
import { xmlDocToString } from "../xml.functions"


@Component({
  animations: animations,
  templateUrl: './input-maps.component.html',
}) export class InputMapsComponent {
  selectedController?: LedController

  constructor(public session: SessionProvider) {}

  updatePort(
    port: Port,
    inputsMap: InputsMap // LEDBlinkyInputMap.xml
  ) {
    port.updateDetails()
    
    const string = xmlDocToString(inputsMap.xml)
    this.session.addFileToSave({file: inputsMap.file, string})
  }
}
