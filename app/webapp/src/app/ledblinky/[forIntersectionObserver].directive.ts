import { Directive, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[forIntersectionObserver]',
})
export class ForIntersectionObserver {
  @Input() threshold = 0 // 0.1 // 10% of the target element must be visible
  @Input() array?: any[]
  @Input() arrayOut: {item: any, show: boolean, elm?: Element}[] = []
  @Output() arrayOutChange = new EventEmitter<any[]>()
  
  private observer: IntersectionObserver = new IntersectionObserver(entries => {
    let count = 0
    entries.forEach((entry, index) => {
      if ( count > 10 ) {
        return // only do 10 at a time
      }

      const itemOut = this.arrayOut.find(a => a.elm === entry.target)
      if ( !itemOut ) {
        return
      }

      itemOut.show = entry.isIntersecting

      if ( entry.isIntersecting ) {
        ++count
      }
    })
  }, {
    threshold: this.threshold,
    rootMargin: '200px',
  })

  constructor(private el: ElementRef) {}

  ngOnDestroy(){
    this.closeArrayOut()
  }

  closeArrayOut() {
    this.arrayOut.forEach(arrayOut => {
      if ( !arrayOut.elm ) {
        return
      }

      this.observer.unobserve(arrayOut.elm)
    })
  }

  ngOnChanges( changes:SimpleChanges ){
    if ( changes['array'] ) {
      this.closeArrayOut()
  
      this.arrayOut = this.array?.map(item => ({item, show: false})) || []
      this.updateArrayOut()      
    }
  }

  updateArrayOut() {
    setTimeout(() => {
      this.arrayOutChange.emit(this.arrayOut)
      setTimeout(() => this.watchKids(), 0)
    }, 0)
  }

  watchKids() {
    const array = this.arrayOut
    const kids = new Array(...this.el.nativeElement.children)
    
    if (array.length !== kids.length ) {
      console.warn(`[forIntersectionObserver].directive expected ${array.length} direct children but got ${kids.length}`)
      return
    }

    kids.forEach((kid, index) => {
      this.arrayOut[index].elm = kid
      this.observer.observe(kid)
    })
  }
}