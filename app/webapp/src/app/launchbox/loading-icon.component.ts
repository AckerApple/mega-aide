import { Component, Input } from "@angular/core"
import { animations } from "ack-angular-fx"
import { Observable } from "rxjs"

@Component({
  selector: 'loading-icon',
  templateUrl: './loading-icon.component.html',
  animations,
}) export class LoadingIconComponent {
  @Input() show: any
  @Input() show$?: Observable<number>
  @Input() label?: string
}
