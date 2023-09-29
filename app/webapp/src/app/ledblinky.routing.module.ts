import { Route } from '@angular/router'
import { LEDBlinkyComponent } from './ledblinky/ledblinky.component'
import { LEDBlinkyControlsComponent } from './ledblinky/ledblinky-controls.component'
import { InputMapsComponent } from './ledblinky/input-maps.component'
import { RomControlsComponent } from './ledblinky/rom-controls.component'
import { LayoutsComponent } from './ledblinky/layouts.component'
import { backups } from './ledblinky/routing.backups'
import { ImportRomComponent } from './ledblinky/ImportRom.component'

export const ledblinky: Route = {
  path: '🚦',
  title: 'LEDBlinky',
  data: {
    emoji: '🚦',
    description: 'Helpful tools that are a great companion with the existing LEDBlinky apps',
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
    description: 'Input mappings that all other LEDBlinky tools refer to for understanding of your machines button configuration.',
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

export const importRom: Route = {
  path: '🚦/🕹/🤝',
  title: 'Import ROM Light Config',
  data: {
    emoji: '🤝',
    description: 'Compare a shared link ROM with your own configs to possibly import',
    style: {
      minWidth:'98vw'
    },
  },
  component: ImportRomComponent,
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
  importRom,
  ledblinkyControls, // emulators and their roms
  rom,
  layouts,
  backups,
}

export const routes: Route[] = Object.values(routeMap)
