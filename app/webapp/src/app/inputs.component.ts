import { Component } from '@angular/core'
import { Route } from '@angular/router'
import { debugKeyboard, gamepads, platforms, xArcade } from './app.routing.module'

@Component({
  templateUrl: './inputs.component.html',
})
export class InputsComponent {
  menu: Route[] = [ platforms, debugKeyboard, xArcade, gamepads ]
}
