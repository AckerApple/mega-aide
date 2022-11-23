import { AppComponent } from './app.component'
import { RobustSelectDirectoryComponent } from './robust-select-directory.component'
import { DebugComponent } from './debug.component'

import { NextKeyDirective } from './nextKey.directive'
import { NextButtonDirective } from './nextButton.directive'

import { LaunchBoxComponent } from './launchbox/launchbox.component'
import { ThemeSettingsComponent } from './launchbox/ThemeSettings.component'

import { MenuComponent } from './menu.component'
import { XarcadeXinputComponent } from './xarcade-xinput.component'
import { XinputMappingComponent } from './xinput-mapping.component'

import { PlatformComponent } from './inputs/platform.component'
import { PlatformsComponent } from './inputs/platforms.component'
import { InputsComponent } from './inputs.component'
import { GamepadsComponent } from './gamepads.component'
import { InputDebugComponent } from './inputs/input-debug.component'
import { PlatformControlMapComponent } from './inputs/platform-control-map.component'

import { PlatformVisualFiltersComponent } from './inputs/platform-visual-filters.component'
import { PlatformFiltersDirective } from './inputs/platform-filters.directive'
import { MenuStackListComponent } from './menu-stack-list.component'
import { ExitComponent } from './exit.component'
import { DetectIssuesComponent } from './launchbox/DetectIssues.component'
import { SaveFilesComponent } from './save-files.component'

export const declarations = [
  AppComponent,
  
  
  NextKeyDirective,
  NextButtonDirective,
  
  PlatformsComponent,
  PlatformComponent,
  InputDebugComponent,
  PlatformControlMapComponent,
  InputsComponent,
  GamepadsComponent,
  MenuComponent,
  DebugComponent,
  
  LaunchBoxComponent,
  DetectIssuesComponent,
  ThemeSettingsComponent,

  XarcadeXinputComponent,
  RobustSelectDirectoryComponent,
  XinputMappingComponent,
  PlatformVisualFiltersComponent,
  PlatformFiltersDirective,
  MenuStackListComponent,
  ExitComponent,
  SaveFilesComponent
]

export default declarations