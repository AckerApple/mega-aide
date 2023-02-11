import { Route } from "@angular/router";
import { DetectDupControllersComponent } from "./detect-issues/detect-dup-controllers.component";
import { DetectXInputPlatformComponent } from "./detect-issues/detect-xinput-platform.component";
import { DetectXinputComponent } from './detect-issues/detect-xinput.component'

export const detectXinputIssues: Route = {
  path: '🧰/detect-issues/🎮',
  title: 'Detect XInput Issues',
  component: DetectXinputComponent,
  data: {
    emoji: '🎮',
    description: 'Robot like reporting of potential XArcade XInput issues',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const detectDupControllers: Route = {
  path: '🧰/detect-issues/controller-duplicates',
  title: 'Detect platform duplicate controller maps',
  component: DetectDupControllersComponent,
  data: {
    emoji: '⚔️',
    description: 'Robot detection of multiple same controller mappings',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}

export const detectXinputPlatform: Route = {
  path: '🧰/detect-issues/🎮/:platform',
  title: 'XInput Platform Issues',
  component: DetectXInputPlatformComponent,
  data: {
    emoji: '🎮',
    description: 'Robot reporting of LaunchBox platform XArcade XInput issues',
    wrapClass: 'bg-black radius-25 pad-2x'
  }
}
