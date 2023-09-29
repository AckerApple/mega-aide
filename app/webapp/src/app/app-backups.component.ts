import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Subscription } from 'rxjs'
import { SessionProvider } from './session.provider'
import { animations } from 'ack-angular-fx'

@Component({
  templateUrl: './app-backups.component.html',
  animations,
})
export class AppBackupsComponent {
  subs = new Subscription()
  path!: string
  fileName!: string

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {
    this.subs.add(
      this.session.launchBox.directoryChange.subscribe(() => {
        this.initLoadFolders()
      })
    )

    this.fileName = this.activatedRoute.snapshot.queryParams['file']
    
    this.initLoadFolders()
  }

  async initLoadFolders() {
    const preloadPath = this.activatedRoute.snapshot.queryParams['path']
    if ( preloadPath ) {
      return this.path = preloadPath
    }  
    
    return this.path = ''
  }

  ngOnDestroy(){
    this.subs.unsubscribe()
  }
}