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
import { LedblinkyControlsLayoutsComponent } from './ledblinky/ledblinky-controls-layouts.component'
import { RomControlsComponent } from './ledblinky/rom-controls.component'
import { PlayerControlRowComponent } from './ledblinky/player-control-row.component'
import { LayoutsComponent } from './ledblinky/layouts.component'
import { LedBlinkyBackupsComponent } from './ledblinky/backups.component'
import { DragSelectorDirective } from './ledblinky/drag-selector.directive'
import { DragSelectorTargetDirective } from './ledblinky/drag-selector-target.directive'
import { InputMapsComponent } from './ledblinky/input-maps.component'
import { SelectLedblinkyDirectoryComponent } from './ledblinky/select-ledblinky-directory.component'

import { ScanBackupsComponent } from './launchbox/ScanBackups.component'
import { LaunchBoxComponent } from './launchbox/launchbox.component'
import { AdditionalAppsTableComponent } from './launchbox/additional-apps-table.component'
import { XinputGamesTableComponent } from './launchbox/xinput-games-table.component'
import { DetectXinputComponent } from './launchbox/detect-issues/detect-xinput.component'
import { DetectXInputPlatformComponent } from './launchbox/detect-issues/detect-xinput-platform.component'
import { DetectDupControllersComponent } from './launchbox/detect-issues/detect-dup-controllers.component'
import { ScanFilesComponent } from './launchbox/detect-issues/scan-files.component'
import { RemapButtonsComponent } from './inputs/remap-buttons.component'
import { NextMouseDirective } from './nextMouse.directive'
import { InputCodeComponent } from './ledblinky/input-code-select.component'
import { LightControlSameRomsComponent } from './ledblinky/light-control-same-roms.component'
import { LightColorInputComponent } from './ledblinky/light-color-input.component'
import { LightControlColorSelectComponent } from './ledblinky/light-control-color-select.component'
import { AppBackupsComponent } from './app-backups.component'
import { CopyPasteComponent } from './ledblinky/copy-paste.component'
import { RomDisplayComponent } from './ledblinky/rom-display.component'
import { ImportRomComponent } from './ledblinky/ImportRom.component'
import { ColorInputsComponent } from './ledblinky/color-inputs.component'
import { ForIntersectionObserver } from './ledblinky/[forIntersectionObserver].directive'

export const declarations = [
  AppComponent,
  ChangelogComponent,
  AppBackupsComponent,

  ForIntersectionObserver,
  DragSelectorDirective,
  DragSelectorTargetDirective,
  
  CopyPasteComponent,
  FileSystemComponent,
  NextKeyDirective,
  NextMouseDirective,
  RemapButtonsComponent,
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
  
  DetectXinputComponent,
  DetectIssuesComponent,
  DetectXInputPlatformComponent,
  DetectDupControllersComponent,
  AdditionalAppsTableComponent,
  XinputGamesTableComponent,
  LaunchBoxComponent,
  ScanFilesComponent,
  LaunchBoxBackupsComponent,
  ScanBackupsComponent,
  SelectLaunchBoxComponent,
  GamesComponent,
  BackupsComponent,
  ThemeSettingsComponent,

  XarcadeXinputComponent,
  XinputMapSelectComponent,
  xinputAppMapSelectComponent,
  XinputMappingComponent,
  XinputBackupsComponent,
  SelectXarcadeXInputPathComponent,

  SelectLedblinkyDirectoryComponent,
  LEDBlinkyComponent,
  RomDisplayComponent,
  LayoutsComponent,
  LEDBlinkyControlsComponent,
  LedblinkyLayoutsComponent,
  LedblinkyControlsLayoutsComponent,
  LedBlinkyBackupsComponent,
  RomControlsComponent,
  PlayerControlRowComponent,
  LightControlSameRomsComponent,
  InputMapsComponent,
  InputCodeComponent,
  LightColorInputComponent,
  LightControlColorSelectComponent,
  ImportRomComponent,
  ColorInputsComponent,
  
  PlatformVisualFiltersComponent,
  PlatformFiltersDirective,
  MenuStackListComponent,
  ExitComponent,
  SaveFilesComponent
]

export default declarations