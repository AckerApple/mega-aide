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

  @ContentChildren(FinderColumnComponent) columnSchema: FinderColumnComponent[] = []
  
  @Output() itemClick = new EventEmitter<T>()
  @Output() back = new EventEmitter()

  sortBy(schema: FinderColumnComponent) {
    const columnName = schema.name || schema.type || 'name'
    const data = this.columns[ this.columns.length - 1 ]
    const clone = [...data]
    const good = clone.find((x, i)=>data[i]!==x)
    
    switch (schema.type) {
      case 'date':
      case 'size':
        ;(data as any).sort((a: any, b:any)=>Number(a[columnName])-Number(b[columnName]))
        break
    
      default:
        ;(data as any).sort((a: any, b: any)=>String(a[columnName]||'').toLowerCase()>String(b[columnName]||'').toLowerCase()?1:-1)
    }

    if ( clone.every((x, i)=>data[i]===x) ) {
      data.reverse()
    }
  }
}
