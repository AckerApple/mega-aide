import { NgModule } from '@angular/core'
import { MenuComponent } from './menu/menu.component'
import { ExitComponent } from './components/exit.component'
import { Route, RouterModule, Routes } from '@angular/router'
import { DebugComponent } from './components/debug.component'


import { XarcadeXinputComponent } from './xarcade-xinput/xarcade-xinput.component'
import { XinputMappingComponent } from './xarcade-xinput/xinput-mapping.component'
import { PlatformsComponent } from './inputs/platforms.component'
import { PlatformComponent } from './inputs/platform.component'
import { InputsComponent } from './inputs/inputs.component'
import { GamepadsComponent } from './inputs/gamepads.component'
import { KeyboardComponent } from './inputs/keyboard.component'
import { launchBoxRoutes } from './launchbox/launchbox.routing.module'
import { XinputBackupsComponent } from './xarcade-xinput/xinput-backups.component'
import { ChangelogComponent } from './components/changelog.component'
import { routes as ledblinkyRoutes } from './ledblinky.routing.module'

export const debugReport: Route = {
  path: '🐞',
  title: 'debug report',
  data: {
    emoji: '🐞',
    description: 'This app does not transmit any information. Review here, all the information this app uses locally only to perform its activities.'
  },
  component: DebugComponent,
}

export const changelog: Route = {
  path: '🖊',
  title: 'change log',
  data: {
    emoji: '🖊',
    description: 'Notable changes made'
  },
  component: ChangelogComponent,
}

export const debugReport2: Route = {
  ...debugReport,
  path: 'debug-report',
}

const menuRoute: Route = {
  path: '🏠',
  title: 'main menu',
  data: {
    emoji: '🏠',
  },
  component: MenuComponent,
}

const menuRoute2: Route = {
  ...menuRoute,
  path: 'menu',
}

export const inputs: Route = {
  path: '🕹',
  title: 'Inputs',
  data: {
    emoji: '⌨️ 🎮 🕹',
    description: 'Tools to assist with keyboards, controllers, and to even manage other software that aims at managing inputs.',
  },
  component: InputsComponent,
}

export const inputs2: Route = {
  ...inputs,
  path: 'inputs',
}

export const xArcade: Route = {
  path: '🕹/xarcade-xinput',
  component: XarcadeXinputComponent,
  title: 'XArcade XInput',
  data: {
    emoji: '🎮 ➡️ ⌨️',
    description: 'Useful utilities to assist with gamepad-to-keyboard mappings',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const xArcadeBackups: Route = {
  path: '🕹/xarcade-xinput/↩',
  component: XinputBackupsComponent,
  title: 'XArcade XInput Backups',
  data: {
    emoji: '🎮 ↩',
    description: 'Helpful restore file abilities',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const platforms: Route = {
  path: '🕹/🗺',
  title: 'platform mappings',
  data: {
    emoji: '🗺',
    description: 'The existing mappings in here can often assist to better understand commonly used mappings. These mappings are also used across this entire app where to support input maps.',
  },
  component: PlatformsComponent,
}

const platforms2: Route = {
  ...platforms,
  path: 'inputs/platforms',
}

export const gamepads: Route = {
  path: '🕹/🎮',
  title: 'Gamepads',
  data: {
    emoji: '🎮',
    description: 'A general tool for debugging devices that appear as a gamepad aka joystick like XBox controllers'
  },
  component: GamepadsComponent,
}

const gamepads2: Route = {
  ...gamepads,
  path: 'inputs/gamepads',
}

export const keyboard: Route = {
  path: '🕹/⌨',
  title: 'Keyboard',
  data: {
    emoji: '⌨️',
    description: 'A general tool for gaining an understanding of what buttons push what keyboard keys',
  },
  component: KeyboardComponent,
}

const keyboard2: Route = {
  ...keyboard,
  path: 'inputs/keyboard',
}

export const exit: Route = {
  path: 'exit',
  title: 'exit',
  data: {
    emoji: '❌',
  },
  component: ExitComponent,
}

const platformEdit: Route = {
  path: '🕹/🗺/:platform',
  title: 'platform editor',
  data: {
    emoji: '🗺',
  },
  component: PlatformComponent,
}

const platformEdit2: Route = {
  path: 'inputs/platforms/:platform',
  title: 'platform editor',
  data: {
    emoji: '🗺',
  },
  component: PlatformComponent,
}

export const menu: Route[] = [
  exit,
  
  ...ledblinkyRoutes,
  ...launchBoxRoutes,
  debugReport, changelog,
  menuRoute, menuRoute2,
  
  // inputs
  inputs,
  platforms, platforms2,
  gamepads, gamepads2,
  keyboard, keyboard2,
  platformEdit, platformEdit2,
  
  // xarcade
  xArcade, xArcadeBackups,
  {
    path: '🕹/xarcade-xinput/mapping/:fileName',
    component: XinputMappingComponent,
    title: 'mapping file',
    data: {
      emoji: '🎮 ➡️ ⌨️',
      description: 'A file dedicated to mapping keyboard inputs into gamepad buttons',
      wrapClass: 'bg-black radius-25 pad-2x'
    }
  }
]

const routes: Routes = [
  ...menu,
  {path: '',   redirectTo: '🏠', pathMatch: 'full' },//default route
  {path: '**',   redirectTo: '🏠' }//404
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
