import { Component, EventEmitter, Input, Output } from "@angular/core";
import { SessionProvider } from "../session.provider";

@Component({
  selector: 'input-code-select',
  templateUrl: './input-code-select.component.html',
}) export class InputCodeComponent {
  inputsMap$ = this.session.ledBlinky.inputsMap$

  @Input() className?: string
  
  @Input() model?: string
  @Output() modelChange = new EventEmitter<string>()

  constructor(
    public session: SessionProvider,
  ) {}
}
