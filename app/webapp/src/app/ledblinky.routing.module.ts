import { Route } from '@angular/router'
import { LEDBlinkyComponent } from './ledblinky/ledblinky.component'
import { LEDBlinkyControlsComponent } from './ledblinky/ledblinky-controls.component'
import { RomControlsComponent } from './ledblinky/rom-controls.component'
import { LayoutsComponent } from './ledblinky/layouts.component'

export const ledblinky: Route = {
  path: '🚦',
  title: 'LEDBlinky',
  data: {
    emoji: '🚦',
    description: '🚧 Currently a work in progress. Future plan is to read LEDBlinky configs to understand individual arcade configurations to assist you better.',
  },
  component: LEDBlinkyComponent,
}

export const ledblinky2: Route = {
  ...ledblinky,
  path: 'ledblinky',
}

export const layouts: Route = {
  path: '🚦/🗺',
  title: 'Layouts',
  data: {
    emoji: '🗺',
    description: 'Manage layout files that are on your machine',
  },
  component: LayoutsComponent,
}

export const ledblinkyControls: Route = {
  path: '🚦/🕹',
  title: 'Controls',
  data: {
    emoji: '🕹',
    description: 'Mappings of game controls to LEDBlinky lighting',
  },
  component: LEDBlinkyControlsComponent,
  children: [{
    path: ':emuName',
    title: 'Emulator',
    component: LEDBlinkyControlsComponent, // does nothing, not needed here
  }]
}

export const rom: Route = {
  path: '🚦/🕹/:emuName/:romName',
  title: 'ROM',
  data: {
    emoji: '👾',
    description: 'Emulator light configurations',
  },
  component: RomControlsComponent,
}

export const routeMap = {
  ledblinky, ledblinky2, ledblinkyControls, rom, layouts
}

export const routes: Route[] = Object.values(routeMap)
