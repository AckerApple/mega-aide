import { Component, Input } from "@angular/core";
import { LightAndControl } from "./ledblinky-layouts.component";

@Component({
  selector: 'light-control-same-roms',
  templateUrl: './light-control-same-roms.component.html',
}) export class LightControlSameRomsComponent {
  @Input() lightControl!: LightAndControl
}