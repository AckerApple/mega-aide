import { NgModule } from '@angular/core'
import { MenuComponent } from './menu.component'
import { RouterModule, Routes } from '@angular/router'
import { DebugComponent } from './debug.component'
import { LaunchBoxComponent } from './launchbox.component'
import { XarcadeXinputComponent } from './xarcade-xinput.component'
import { XinputMappingComponent } from './xinput-mapping.component'

import { KeyboardComponent } from './keyboard.component'
import { InputsComponent } from './inputs.component'
import { GamepadsComponent } from './gamepads.component'

export const menu = [
  {
    name: 'menu',
    path: 'menu',
    component: MenuComponent,
  },{
    name: 'debug-report',
    path: 'debug-report',
    component: DebugComponent,
  },{
    name: 'launch-box',
    path: 'launch-box',
    component: LaunchBoxComponent,
    data: {
      title: '🧰 LaunchBox tools',
      description: 'Useful utilities to assist with LaunchBox',
      wrapClass: 'bg-black radius-25 pad-4x'
    }
  },{
    name: 'inputs',
    path: 'inputs',
    component: InputsComponent,
  },{
    name: 'inputs/keyboard',
    path: 'inputs/keyboard',
    component: KeyboardComponent,
  },{
    name: 'inputs/gamepads',
    path: 'inputs/gamepads',
    component: GamepadsComponent,
  },{
    name: 'xarcade-xinput',
    path: 'xarcade-xinput',
    component: XarcadeXinputComponent,
    data: {
      title: '🎮 ➡️ ⌨️ XArcade XInput',
      description: 'Useful utilities to assist with gamepad to keyboard mappings',
      wrapClass: 'bg-black radius-25 pad-4x'
    }
  },{
    name: 'xarcade-xinput-mapping',
    path: 'xarcade-xinput/mapping/:fileName',
    component: XinputMappingComponent,
    data: {
      title: '🎮 ➡️ ⌨️ XArcade XInput mapping file',
      description: 'A file dedicated to mapping keyboard inputs into gamepad buttons',
      wrapClass: 'bg-black radius-25 pad-4x'
    }
  }
]

const routes: Routes = [
  ...menu,
  {path: '',   redirectTo: 'menu', pathMatch: 'full' },//default route
  {path: '**',   redirectTo: 'menu' }//404
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
