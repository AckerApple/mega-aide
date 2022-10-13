import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgModule } from '@angular/core'
import { AckModule, AckRouterModule } from 'ack-angular'
import { AppRoutingModule } from './app.routing.module'

import { SessionProvider } from './session.provider'

import { AppComponent } from './app.component'
import { NextKeyDirective } from './nextKey.directive'
import { DebugComponent } from './debug.component'
import { RobustSelectDirectoryComponent } from './robust-select-directory.component'

import { MenuComponent } from './menu.component'
import { XarcadeXinputComponent } from './xarcade-xinput.component'
import { LaunchBoxComponent } from './launchbox.component'
import { XinputMappingComponent } from './xinput-mapping.component'

import { KeyboardComponent } from './keyboard.component'
import { InputsComponent } from './inputs.component'
import { GamepadsComponent } from './gamepads.component'

@NgModule({
  declarations: [
    AppComponent,
    NextKeyDirective,
    KeyboardComponent,
    InputsComponent,
    GamepadsComponent,
    MenuComponent,
    DebugComponent,
    LaunchBoxComponent,
    XarcadeXinputComponent,
    RobustSelectDirectoryComponent,
    XinputMappingComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AckModule,
    AckRouterModule,
  ],
  providers: [ SessionProvider ],
  bootstrap: [AppComponent]
})
export class AppModule { }
