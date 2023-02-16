import { Component } from '@angular/core'
import { animations } from 'ack-angular-fx'
import { SessionProvider } from '../session.provider'
import { detectXinputIssues, detectDupControllers, scanFileSizes } from './detectXinputIssues.routing'

@Component({
  templateUrl: './DetectIssues.component.html',
  animations,
})
export class DetectIssuesComponent {  
  routes = { detectXinputIssues, detectDupControllers, scanFileSizes }

  constructor( public session: SessionProvider ) {}
}
