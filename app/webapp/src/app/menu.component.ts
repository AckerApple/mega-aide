import { Component } from '@angular/core'
import { openAnchor } from './app.component'

@Component({
  // selector: 'menu',
  templateUrl: './menu.component.html',
})
export class MenuComponent {
  openAnchor = openAnchor
}