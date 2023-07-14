import { Directive, EventEmitter, HostListener, Input, Output } from '@angular/core'
import { LastButtonsProvider } from './inputs/LastButtons.provider'

@Directive({
  selector: "[nextButton]",
  providers: [ LastButtonsProvider ],
  exportAs: 'nextButton'
})
export class NextButtonDirective {
  @Input() startByEvent?: 'click' | 'dblclick' | 'contextmenu'
  @Input() nextButton?: number | string // index 0 - *
  @Output() nextButtonChange: EventEmitter<number> = new EventEmitter()
  
  @Input() nextAxis?: string | number // +2 === positive axis in index 2
  @Output() nextAxisChange: EventEmitter<string> = new EventEmitter()
    
  @Input('nextButtonListening') listening?: boolean | number
  @Output('listeningChange') listeningChange: EventEmitter<boolean> = new EventEmitter()

  constructor(public lastButtons: LastButtonsProvider) {
    this.lastButtons.listeningChange.subscribe(x =>
      this.listeningChange.emit(this.listening = x)
    )

    this.lastButtons.buttonPress.subscribe( x => {
      this.nextButtonChange.emit(this.nextButton = x)
      this.lastButtons.removeListeners()
    })

    this.lastButtons.axisPress.subscribe( x => {
      this.nextAxisChange.emit(this.nextAxis=x)
      this.lastButtons.removeListeners()
    })
  }

  ngOnChanges( changes:any ){
    if ( changes.listening ) {
      if ( !this.listening ) {
        this.lastButtons.removeListeners()
      } else {
        this.lastButtons.startListening()
      }
    }
  }

  @HostListener('contextmenu', ['$event']) onRightClick($event: MouseEvent) {
    if ( this.startByEvent !== 'contextmenu' ) {
      return
    }
    this.lastButtons.toggleListening()
    $event.preventDefault()
  }

  @HostListener('click') onClick() {
    if ( this.startByEvent && this.startByEvent !== 'click' ) {
      return
    }
    this.lastButtons.toggleListening()
  }
  
  @HostListener('dblclick') onDblClick() {
    if ( this.startByEvent !== 'dblclick' ) {
      return
    }
    this.lastButtons.toggleListening()
  }
}
