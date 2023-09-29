import { EventEmitter } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { updateElementAttributes } from "./element.utils"

export class XmlDetails<T> {
  constructor(
    public details: T,
    public element: Element,
  ) {
    this.details$.next(details) // cause listeners of cssColor to update
  }

  details$ = new BehaviorSubject<T>(this.details)
  detailsChanged$ = new EventEmitter<T>()// new Subject<PlayerControlDetails>()
  
  deleted?: boolean
  deletedFrom?: ParentNode // allows for restore

  addDetails(details: Partial<T>) {
    Object.assign(this.details as Partial<T>, details)
    this.update()
  }

  setDetails(details: T) {
    this.details = details as T
    this.update()
  }

  setDetailsJson(details: string | null) {
    if ( details === null ) {
      return
    }

    this.setDetails( JSON.parse(details) as T )
    this.update()
  }

  setDetailsEval(details: string | null) {
    if ( details === null ) {
      return
    }

    const x = eval(`(() => (${details}))()`) as T
    this.setDetails( x )
    this.update()
  }

  update() {
    this.updateXml()
    this.details$.next(this.details) // cause cssColor$ to update
    this.detailsChanged$.emit(this.details) // cause listeners to know we update details
  }

  updateXml() {
    return updateElementAttributes(this.element, this.details as Record<string, any>)
  }

  restore() {
    if ( !this.deletedFrom ) {
      return
    }

    this.deletedFrom.appendChild(this.element)
    delete this.deletedFrom
    delete this.deleted
  }

  delete() {
    this.deleted = true // signal to other parsers that this is now deleted
    const element = this.element
    const parent = element.parentNode
    
    if ( parent ) {
      this.deletedFrom = parent
      parent?.removeChild(element)
    }
    
    this.update() // cause redraw
  }
}
