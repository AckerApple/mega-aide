import { animations } from 'ack-angular-fx'
import { Component, EventEmitter, Output } from '@angular/core'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { SessionProvider } from '../session.provider'
import { Subscription } from 'rxjs'

@Component({
  animations,
  selector: 'select-launchbox',
  templateUrl: './select-launchbox.component.html',
})
export class SelectLaunchBoxComponent {
  @Output() change = new EventEmitter<DirectoryManager>()

  subs = new Subscription()

  constructor(public session: SessionProvider) {}

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
  
  async setDirectory(directoryManager: DirectoryManager) {
    this.session.load$.next(1)
    const launchbox = this.session.launchBox
    
    // emit to listeners
    launchbox.directoryChange.next(directoryManager)
    // await launchbox.onDirectory()
    
    this.change.emit(directoryManager)
    this.session.save()
    this.session.load$.next(-1)
  }  
}
