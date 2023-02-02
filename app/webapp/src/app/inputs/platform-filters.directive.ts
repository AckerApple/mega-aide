import { Directive, Input } from '@angular/core'

@Directive({
  selector: 'platform-filters',
  exportAs: 'platformFilters'
})
export class PlatformFiltersDirective {
  @Input() labelType: LabelType = true
  @Input() controllerSize: number = 16
  extra: { [index: string]: any } = {}
}

export type LabelType = boolean | 'keyboard' // | number