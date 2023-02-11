import { Component } from "@angular/core"
import { games, themeSettings } from './launchbox.routing.module'
import { backups } from './routing.backups'
import { xArcade } from '../app.routing.module'
import { ledblinky } from '../ledblinky.routing.module'
import { detectIssues } from "./detectIssues.routing"

@Component({
  templateUrl: './launchbox.component.html',
}) export class LaunchBoxComponent {
  menu = [
    themeSettings, detectIssues,
    games, backups, xArcade, ledblinky
  ]
}
