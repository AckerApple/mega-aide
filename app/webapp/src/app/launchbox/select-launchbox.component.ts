import { animations } from 'ack-angular-fx'
import { Component, EventEmitter, Output } from '@angular/core'
import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { xArcade } from '../app.routing.module'
import { backups, detectIssues, games, themeSettings } from './launchbox.routing.module'
import { SessionProvider } from '../session.provider'
import { ledblinky } from '../ledblinky.routing.module'
import { Subscription } from 'rxjs'

@Component({
  animations,
  selector: 'select-launchbox',
  templateUrl: './select-launchbox.component.html',
})
export class SelectLaunchBoxComponent {
  @Output() change = new EventEmitter<DirectoryManager>()

  subs = new Subscription()

  menu = [
    themeSettings, detectIssues,
    games, backups,
  ]

  constructor(public session: SessionProvider) {
    if ( session.launchBox.directory ) {
      this.onDirectory()
    }
    
    this.subs.add(
      this.session.launchBox.directoriesChange.subscribe(() => {
        this.onDirectory()
      })
    )
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
  
  async setDirectory(directoryManager: DirectoryManager) {
    ++this.session.loading
    const launchbox = this.session.launchBox
    
    // emit to listeners
    launchbox.directory = directoryManager
    launchbox.directoryChange.emit(directoryManager)
    await launchbox.onDirectory()
    
    this.change.emit(directoryManager)
    this.session.save()
    this.onDirectory()
    --this.session.loading
  }
  
  onDirectory() {
    const addBlinky = this.session.ledBlinky.directory && !this.menu.includes(ledblinky)
    // add as launchbox menu item
    if ( addBlinky ) {
      this.menu.push(ledblinky)
    }
    
    // add as launchbox menu item
    if ( this.session.xarcadeDirectory && !this.menu.includes(xArcade) ) {
      this.menu.push(xArcade)
    }
  }
}
