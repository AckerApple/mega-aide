import { Component } from '@angular/core'
import { Route } from '@angular/router'
import { keyboard, gamepads, platforms, xArcade } from '../app.routing.module'

@Component({
  templateUrl: './inputs.component.html',
})
export class InputsComponent {
  menu: Route[] = [ platforms, keyboard, xArcade, gamepads ]
}
