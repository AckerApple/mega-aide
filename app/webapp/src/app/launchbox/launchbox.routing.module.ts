import { Route } from '@angular/router'
import { GamesComponent } from './games.component'
import { ThemeSettingsComponent } from './ThemeSettings.component'
import { backups, backups2 } from './routing.backups'
import { detectIssues, detectIssues2, scanBackups } from './detectIssues.routing'
import { scanFileSizes, detectDupControllers, detectXinputIssues, detectXinputPlatform } from './detectXinputIssues.routing'
import { LaunchBoxComponent } from './launchbox.component'

export const launchBox: Route = {
  path: '🧰',
  title: 'LaunchBox',
  component: LaunchBoxComponent,
  data: {
    emoji: '🧰',
    description: 'Useful utilities to assist with LaunchBox',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const launchBox2: Route = {
  ...launchBox,
  path: 'launchbox',
}

export const games: Route = {
  path: '🧰/games',
  title: 'Game Helper',
  component: GamesComponent,
  data: {
    emoji: '👾',
    description: 'Utilities to help manage LaunchBox game configs',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

const games2: Route = {
  path: 'launchbox/games',
  ...games,
}

export const themeSettings: Route = {
  path: '🧰/theme-settings',
  title: 'Theme Settings',
  component: ThemeSettingsComponent,
  data: {
    emoji: '🎨',
    description: 'Launchbox settings specific to themes',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

const themeSettings2: Route = {
  ...themeSettings,
  path: 'launchbox/theme-settings',
}

export const routeMap = {
  launchBox, launchBox2,
  themeSettings, themeSettings2,
  
  scanFileSizes, detectIssues, detectIssues2, detectXinputPlatform,
  detectXinputIssues, scanBackups, detectDupControllers,

  games, games2,
  backups, backups2
}

export const launchBoxRoutes: Route[] = Object.values(routeMap)