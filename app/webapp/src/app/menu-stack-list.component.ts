import { Component, Input } from "@angular/core";
import { Route } from "@angular/router";

@Component({
  selector: 'menu-stack-list',
  templateUrl: './menu-stack-list.component.html',
  providers: [],
}) export class MenuStackListComponent {
  @Input() menu!: Route[]
}
