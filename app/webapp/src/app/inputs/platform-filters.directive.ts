import { Directive, Input } from '@angular/core'

@Directive({
  selector: 'platform-filters',
  exportAs: 'platformFilters'
})
export class PlatformFiltersDirective {
  @Input() useLabels: boolean | string | number = false
  @Input() controllerSize: number = 16
  extra: { [index: string]: any } = {}
}
