import { Route } from '@angular/router'
import { SelectLaunchBoxComponent } from './select-launchbox.component'
import { GamesComponent } from './games.component'
import { DetectIssuesComponent } from './DetectIssues.component'
import { ScanBackupsComponent } from './ScanBackups.component'
import { ThemeSettingsComponent } from './ThemeSettings.component'
import { LaunchBoxBackupsComponent } from './backups.component'

export const launchBox: Route = {
  path: '🧰',
  title: 'LaunchBox',
  component: SelectLaunchBoxComponent,
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

export const detectIssues: Route = {
  path: '🧰/detect-issues',
  title: 'Detect Issues',
  component: DetectIssuesComponent,
  data: {
    emoji: '🔦',
    description: 'Robot like reporting of potential Launchbox issues',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const scanBackups: Route = {
  path: '🧰/detect-issues/scan-backups',
  title: 'Scan Backups',
  component: ScanBackupsComponent,
  data: {
    emoji: '↩️',
    description: 'Detect outdated or non-existent backups',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const detectIssues2: Route = {
  ...detectIssues,
  path: 'launchbox/detect-issues'
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

export const backups: Route = {
  path: '🧰/↩',
  title: 'Backups',
  component: LaunchBoxBackupsComponent,
  data: {
    emoji: '↩',
    description: 'File navigator to restore backup files',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const backups2: Route = {
  ...backups,
  path: 'launchbox/backups',
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
  detectIssues, detectIssues2, scanBackups,
  games, games2,
  backups, backups2
}

export const launchBoxRoutes: Route[] = Object.values(routeMap)