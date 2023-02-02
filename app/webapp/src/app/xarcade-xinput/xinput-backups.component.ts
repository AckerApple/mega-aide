import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { SessionProvider } from '../session.provider'

@Component({
  templateUrl: './xinput-backups.component.html',
})
export class XinputBackupsComponent {
  path!: string
  fileName!: string

  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {
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
}