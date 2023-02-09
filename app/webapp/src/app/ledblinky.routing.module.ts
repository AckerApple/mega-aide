import { Route } from '@angular/router'
import { LEDBlinkyComponent } from './ledblinky/ledblinky.component'
import { LEDBlinkyControlsComponent } from './ledblinky/ledblinky-controls.component'
import { InputMapsComponent } from './ledblinky/input-maps.component'
import { RomControlsComponent } from './ledblinky/rom-controls.component'
import { LayoutsComponent } from './ledblinky/layouts.component'

export const ledblinky: Route = {
  path: '🚦',
  title: 'LEDBlinky',
  data: {
    emoji: '🚦',
    description: 'Helpful LEDBlinky tools',
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
    description: 'Layout files that resemble real world physical layouts of buttons',
  },
  component: LayoutsComponent,
}

export const inputMaps: Route = {
  path: '🚦/⚙️',
  title: 'Input Maps',
  data: {
    emoji: '⚙️',
    description: 'Input mappings that all other LEDBlinky tools refer to for understanding your machines button inputs',
  },
  component: InputMapsComponent,
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
  ledblinky, ledblinky2,
  inputMaps,
  ledblinkyControls, rom, layouts
}

export const routes: Route[] = Object.values(routeMap)
