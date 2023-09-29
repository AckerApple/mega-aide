import { Route } from "@angular/router"
import { LedBlinkyBackupsComponent } from "./backups.component"

export const backups: Route = {
  path: '🚦/↩',
  title: 'Backups',
  component: LedBlinkyBackupsComponent,
  data: {
    emoji: '↩',
    description: 'File navigator to restore backup files',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const backups2: Route = {
  ...backups,
  path: 'ledblinky/backups',
}
