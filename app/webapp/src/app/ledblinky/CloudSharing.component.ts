import { Component } from "@angular/core"
import { animations } from "ack-angular-fx"
import { SessionProvider } from "../session.provider"
import { BehaviorSubject } from "rxjs"
import { ActivatedRoute } from "@angular/router"


@Component({
  animations: animations,
  templateUrl: './CloudSharing.component.html',
}) export class CloudSharingComponent {
  constructor(
    public session: SessionProvider,
    public activatedRoute: ActivatedRoute,
  ) {
    const requestSearch = this.activatedRoute.snapshot.queryParams['sharePath']
    if ( requestSearch ) {
      this.sharePath$.next( requestSearch )
    }
  }

  sharePath$ = new BehaviorSubject<string>('')
}
