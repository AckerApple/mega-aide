import { Component, EventEmitter, Input, Output } from "@angular/core";
import { animations } from "ack-angular-fx";

@Component({
  selector: 'remap-buttons',
  templateUrl: './remap-buttons.component.html',
  animations,
}) export class RemapButtonsComponent {
  @Input() classes!: string
  
  @Input() key!: string
  @Output() keyChange = new EventEmitter<string>()
  @Input() keyCode!: number
  @Output() keyCodeChange = new EventEmitter<number>()
  @Input() keyListen!: number | boolean
  @Output() keyListenChange = new EventEmitter<number | boolean>()
  
  @Input() useMouse = true
  @Input() mouse!: number
  @Output() mouseChange = new EventEmitter<number>()
  @Input() mouseListen!: number | boolean
  @Output() mouseListenChange = new EventEmitter<number | boolean>()
}
