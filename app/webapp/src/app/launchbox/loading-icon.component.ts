import { Component, Input } from "@angular/core"
import { animations } from "ack-angular-fx"

@Component({
  selector: 'loading-icon',
  templateUrl: './loading-icon.component.html',
  animations,
}) export class LoadingIconComponent {
  @Input() show: any
  @Input() label?: string
}
