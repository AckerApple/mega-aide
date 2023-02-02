import { AppComponent } from './app.component'

import { NextKeyDirective } from './nextKey.directive'
import { NextButtonDirective } from './nextButton.directive'

import { SaveFilesComponent } from './components/save-files.component'
import { ExitComponent } from './components/exit.component'
import { BackupsComponent } from './components/backups.component'
import { DebugComponent } from './components/debug.component'

import { LaunchBoxBackupsComponent } from './launchbox/backups.component'
import { SelectLaunchBoxComponent } from './launchbox/select-launchbox.component'
import { GamesComponent } from './launchbox/games.component'
import { ThemeSettingsComponent } from './launchbox/ThemeSettings.component'

import { MenuComponent } from './menu/menu.component'
import { MenuStackListComponent } from './menu/menu-stack-list.component'

import { PlatformComponent } from './inputs/platform.component'
import { PlatformsComponent } from './inputs/platforms.component'
import { InputsComponent } from './inputs/inputs.component'
import { GamepadsComponent } from './inputs/gamepads.component'
import { KeyboardComponent } from './inputs/keyboard.component'
import { PlatformControlMapComponent } from './inputs/platform-control-map.component'
import { PlatformVisualFiltersComponent } from './inputs/platform-visual-filters.component'
import { PlatformFiltersDirective } from './inputs/platform-filters.directive'

import { DetectIssuesComponent } from './launchbox/DetectIssues.component'
import { FinderFilesComponent } from './components/finder-files.component'
import { LoadingIconComponent } from './launchbox/loading-icon.component'
import { PlatformPlayerControlComponent } from './inputs/platform-player-control.component'
import { FileSystemComponent } from './components/filesystem-tester.component'
import { FinderColumnComponent } from './components/finder-column.component'
import { ChangelogComponent } from './components/changelog.component'

import { XinputMapSelectComponent } from './xarcade-xinput/xinput-map-select.component'
import { xinputAppMapSelectComponent } from './xarcade-xinput/xinput-app-map-select.component'
import { SelectXarcadeXInputPathComponent } from './xarcade-xinput/select-xarcade-xinput-path.component'
import { XarcadeXinputComponent } from './xarcade-xinput/xarcade-xinput.component'
import { XinputMappingComponent } from './xarcade-xinput/xinput-mapping.component'
import { XinputBackupsComponent } from './xarcade-xinput/xinput-backups.component'

import { LEDBlinkyComponent } from './ledblinky/ledblinky.component'
import { LEDBlinkyControlsComponent } from './ledblinky/ledblinky-controls.component'
import { LedblinkyLayoutsComponent } from './ledblinky/ledblinky-layouts.component'
import { RomControlsComponent } from './ledblinky/rom-controls.component'
import { LayoutsComponent } from './ledblinky/layouts.component'
import { ScanBackupsComponent } from './launchbox/ScanBackups.component'

export const declarations = [
  AppComponent,
  ChangelogComponent,
  
  FileSystemComponent,
  NextKeyDirective,
  NextButtonDirective,
  FinderFilesComponent,
  FinderColumnComponent,
  LoadingIconComponent,
  
  PlatformsComponent,
  PlatformPlayerControlComponent,
  PlatformComponent,
  KeyboardComponent,
  PlatformControlMapComponent,
  InputsComponent,
  GamepadsComponent,
  MenuComponent,
  DebugComponent,
  
  LaunchBoxBackupsComponent,
  ScanBackupsComponent,
  SelectLaunchBoxComponent,
  GamesComponent,
  BackupsComponent,
  DetectIssuesComponent,
  ThemeSettingsComponent,

  XarcadeXinputComponent,
  XinputMapSelectComponent,
  xinputAppMapSelectComponent,
  XinputMappingComponent,
  XinputBackupsComponent,
  SelectXarcadeXInputPathComponent,

  LEDBlinkyComponent,
  LayoutsComponent,
  LEDBlinkyControlsComponent,
  LedblinkyLayoutsComponent,
  RomControlsComponent,

  PlatformVisualFiltersComponent,
  PlatformFiltersDirective,
  MenuStackListComponent,
  ExitComponent,
  SaveFilesComponent
]

export default declarations