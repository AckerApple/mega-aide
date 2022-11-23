import { NgModule } from '@angular/core'
import { MenuComponent } from './menu.component'
import { ExitComponent } from './exit.component'
import { Route, RouterModule, Routes } from '@angular/router'
import { DebugComponent } from './debug.component'

import { LaunchBoxComponent } from './launchbox/launchbox.component'
import { DetectIssuesComponent } from './launchbox/DetectIssues.component'

import { XarcadeXinputComponent } from './xarcade-xinput.component'
import { XinputMappingComponent } from './xinput-mapping.component'
import { PlatformsComponent } from './inputs/platforms.component'
import { PlatformComponent } from './inputs/platform.component'
import { InputsComponent } from './inputs.component'
import { GamepadsComponent } from './gamepads.component'
import { InputDebugComponent } from './inputs/input-debug.component'
import { ThemeSettingsComponent } from './launchbox/ThemeSettings.component'

export const launchBox: Route = {
  path: 'launchbox',
  title: 'LaunchBox',
  component: LaunchBoxComponent,
  data: {
    emoji: '🧰',
    description: 'Useful utilities to assist with LaunchBox',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const detectIssues: Route = {
  path: 'launchbox/detect-issues',
  title: 'Detect Issues',
  component: DetectIssuesComponent,
  data: {
    emoji: '🔦',
    description: 'Robot like reporting of potential Launchbox issues',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const themeSettings: Route = {
  path: 'launchbox/theme-settings',
  title: 'Theme Settings',
  component: ThemeSettingsComponent,
  data: {
    emoji: '🎨',
    description: 'Launchbox settings specific to themes',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const debugReport: Route = {
  path: 'debug-report',
  title: 'debug report',
  data: {
    emoji: '🐞',
  },
  component: DebugComponent,
}

export const inputs: Route = {
  path: 'inputs',
  title: 'Inputs',
  data: {
    emoji: '⌨️ 🎮 🕹',
  },
  component: InputsComponent,
}

export const xArcade: Route = {
  path: 'inputs/xarcade-xinput',
  component: XarcadeXinputComponent,
  title: 'XArcade XInput',
  data: {
    emoji: '🎮 ➡️ ⌨️',
    description: 'Useful utilities to assist with gamepad to keyboard mappings',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const platforms: Route = {
  path: 'inputs/platforms',
  title: 'platform mappings',
  data: {
    emoji: '🗺',
  },
  component: PlatformsComponent,
}

export const gamepads: Route = {
  path: 'inputs/gamepads',
  title: 'Gamepads',
  data: {
    emoji: '🎮',
  },
  component: GamepadsComponent,
}

export const debugKeyboard: Route = {
  path: 'inputs/debug',
  title: 'Keyboard',
  data: {
    emoji: '⌨️',
  },
  component: InputDebugComponent,
}

export const exit: Route = {
  path: 'exit',
  title: 'exit',
  data: {
    emoji: '❌',
  },
  component: ExitComponent,
}

export const menu: Route[] = [
  exit,debugReport, launchBox, themeSettings, detectIssues, inputs,platforms,
  gamepads, debugKeyboard, xArcade,
  {
    path: 'menu',
    title: 'main menu',
    data: {
      emoji: '⠇',
    },
    component: MenuComponent,
  },{
    path: 'inputs/platforms/:platform',
    title: 'platform editor',
    data: {
      emoji: '⚙️',
    },
    component: PlatformComponent,
  },{
    path: 'inputs/xarcade-xinput/mapping/:fileName',
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
  {path: '',   redirectTo: 'menu', pathMatch: 'full' },//default route
  {path: '**',   redirectTo: 'menu' }//404
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
