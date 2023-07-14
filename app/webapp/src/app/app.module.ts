import { BrowserAnimationsModule } from "@angular/platform-browser/animations"
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgModule } from '@angular/core'
import { AckModule, AckRouterModule } from 'ack-angular'
import { AppRoutingModule } from './app.routing.module'

import { SessionProvider } from './session.provider'

import { AppComponent } from './app.component'
import declarations from './app.declarations'
import { AckComponentsModule } from "ack-angular-components"
import { XArcadeXInputProvider } from "./xarcade-xinput/XArcadeXInput.provider"
import { AckFxModule } from "ack-angular-fx"
import { InputCodeComponent } from "./ledblinky/input-code-select.component"

@NgModule({
  declarations,
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AckModule,
    AckRouterModule,
    AckComponentsModule,
    AckFxModule,
  ],
  providers: [ SessionProvider, XArcadeXInputProvider ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
