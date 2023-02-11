import { Route } from "@angular/router"
import { LaunchBoxBackupsComponent } from "./backups.component"

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
