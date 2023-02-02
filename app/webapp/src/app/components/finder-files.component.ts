import { Component, ContentChildren, ElementRef, EventEmitter, Input, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { FinderColumnComponent } from './finder-column.component'

export interface FinderItem {
  name: string
  kind?: 'FILE' | 'DIRECTORY'
}

@Component({
  selector: 'finder-files',
  templateUrl: './finder-files.component.html',
  animations,
}) export class FinderFilesComponent<T extends FinderItem, Parent extends FinderItem> {
  @Input() parent?: Parent
  @Input() wrapClass?: any
  @Input() columns: T[][] = []
  @Input() routerLinkBase?: string

  @ContentChildren(FinderColumnComponent) columnSchema: TemplateRef<FinderColumnComponent>[] = []
  
  @Output() itemClick = new EventEmitter<T>()
  @Output() back = new EventEmitter()
}
