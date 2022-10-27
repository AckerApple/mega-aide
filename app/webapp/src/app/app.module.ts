import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgModule } from '@angular/core'
import { AckModule, AckRouterModule } from 'ack-angular'
import { AppRoutingModule } from './app.routing.module'

import { SessionProvider } from './session.provider'

import { AppComponent } from './app.component'
import { RobustSelectDirectoryComponent } from './robust-select-directory.component'
import { DebugComponent } from './debug.component'

import { NextKeyDirective } from './nextKey.directive'
import { NextButtonDirective } from './nextButton.directive'

import { MenuComponent } from './menu.component'
import { XarcadeXinputComponent } from './xarcade-xinput.component'
import { LaunchBoxComponent } from './launchbox.component'
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

@NgModule({
  declarations: [
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
    XarcadeXinputComponent,
    RobustSelectDirectoryComponent,
    XinputMappingComponent,
    PlatformVisualFiltersComponent,
    PlatformFiltersDirective,
    MenuStackListComponent,
    ExitComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AckModule,
    AckRouterModule,
  ],
  providers: [ SessionProvider ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
