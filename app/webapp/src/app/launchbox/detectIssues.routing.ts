import { DetectIssuesComponent } from './DetectIssues.component'
import { ScanBackupsComponent } from './ScanBackups.component'
import { Route } from '@angular/router'

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
