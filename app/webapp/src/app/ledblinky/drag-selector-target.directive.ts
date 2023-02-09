import { Directive, ElementRef, Input } from "@angular/core"
import { DragSelectorDirective } from "./drag-selector.directive"

@Directive({
    selector: '[drag-selector-target]',
    exportAs: 'dragSelectorTarget'
  }) export class DragSelectorTargetDirective {
    @Input('drag-selector-target') dragSelectorTarget: any
    selected = false
  
    constructor(
      public dragSelector: DragSelectorDirective,
      public elementRef: ElementRef
    ) {
      this.dragSelector.targets.push(this)
    }
  
    ngOnDestroy() {
      const index = this.dragSelector.targets.findIndex(x => x === this)
      this.dragSelector.targets.splice(index, 1)
    }
  }
  