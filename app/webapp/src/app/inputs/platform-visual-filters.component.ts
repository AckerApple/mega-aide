import { Component, Input } from '@angular/core'
import { PlatformFiltersDirective } from './platform-filters.directive'

@Component({
  selector: 'platform-visual-filters',
  templateUrl: './platform-visual-filters.component.html',
})
export class PlatformVisualFiltersComponent {
  @Input() filters!: PlatformFiltersDirective
}
