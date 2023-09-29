import { Component, EventEmitter, Input, Output } from "@angular/core";
import { PlayerControl, PlayerControlDetails } from "./PlayerControl.class";
import { SessionProvider } from "../session.provider";
import { LightAndControl } from "./LightAndControl.interface";
import { NewPlayer } from "./Player.class";

let count = 0

@Component({
  selector: '[player-control-row]',
  templateUrl: './player-control-row.component.html',
}) export class PlayerControlRowComponent {
  @Input() control!: PlayerControl
  @Input() player!: NewPlayer
  @Input() playerIndex!: number
  @Input() details!: PlayerControlDetails
  @Input() showEdit?: boolean

  @Input() lightControl?: LightAndControl

  @Output() updated = new EventEmitter<void>()
  @Output() deleted = new EventEmitter<void>()

  uid = ++count
  constructor(public session: SessionProvider) { }

  async applyKeyListen(
    key: string,
    inputCodes: string[],
    inputCodeIndex: number
  ) {
    const newKey = key
      .replace(/(^Digit|^Key)/, '')
      .replace(/ShiftLeft/i, 'LSHIFT')
      .replace(/ShiftRight/i, 'RSHIFT')
      .replace(/ControlLeft/i, 'LCONTROL')
      .replace(/ControlRight/i, 'RCONTROL')
      .replace(/AltLeft/i, 'LALT')
      .replace(/AltRight/i, 'RALT')
      .replace(/^arrow/i, '')

    const fullKey = 'KEYCODE_' + newKey.toUpperCase()
    inputCodes[inputCodeIndex] = fullKey

    const inputCodesString = inputCodes.join('|')
    this.control.xml.addDetails({inputCodes: inputCodesString})

    // this.updateDetailsByCodes(control)
    this.updated.emit()
  }

  async applyMouseListen(
    button: number,
    inputCodes: string[],
    inputCodeIndex: number
  ) {
    const fullKey = `MOUSECODE_1_BUTTON` + (button + 1)
    inputCodes[inputCodeIndex] = fullKey

    const inputCodesString = inputCodes.join('|')
    this.control.xml.addDetails({inputCodes: inputCodesString})

    // this.updateDetailsByCodes(control)
    this.updated.emit()
  }

}
