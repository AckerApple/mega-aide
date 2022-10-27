import { Component } from '@angular/core'
import { openAnchor } from './app.component'
import { debugReport, inputs, launchBox } from './app.routing.module'

@Component({
  templateUrl: './menu.component.html',
})
export class MenuComponent {
  openAnchor = openAnchor
  menu = [ launchBox, debugReport, inputs ]
}