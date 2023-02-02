import { Component, Input, TemplateRef } from '@angular/core'

@Component({
  selector: 'finder-column',
  template: '<ng-content></ng-content>',
}) export class FinderColumnComponent {
  @Input() name?: string
  @Input() label?: string // <th>
  @Input() type?: 'name' | 'date' | 'size'
  @Input() template?: TemplateRef<any>
}
