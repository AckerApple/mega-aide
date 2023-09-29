import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Light } from "./Light.class";

@Component({
  selector: 'light-color-input',
  templateUrl: './light-color-input.component.html',
}) export class LightColorInputComponent {
  @Input() light!: Light
  @Output() changed = new EventEmitter<Light>()
}
