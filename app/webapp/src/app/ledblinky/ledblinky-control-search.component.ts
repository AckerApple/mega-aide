import { Component, EventEmitter, Input, Output } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Emulator, NewEmulator } from "./Emulator.class";
import { SessionProvider } from "../session.provider";

@Component({
  selector: 'ledblinky-control-search',
  templateUrl: './ledblinky-control-search.component.html',
}) export class LedblinkyControlSearchComponent {
  @Input() showMaps? = false
  @Input() search?: string | null = ''
  @Input() allowUnknownMode!: boolean
  
  @Input() emulators: (Emulator | NewEmulator)[] | null = null
  
  @Input() emulator?: Emulator | NewEmulator | null = null
  @Output() emulatorChange = new EventEmitter<Emulator | NewEmulator | null | undefined>()
  
  @Input() romClass: NewEmulator | null | undefined = null
  
  @Input() unknownMode: boolean | null = false
  @Output() unknownModeChange = new EventEmitter<boolean>()
  
  @Output() searchChange = new EventEmitter<string>()

  constructor(public session: SessionProvider) {}

  emusOut: any[] = [] // lazy load
  romsOut: any[] = [] // lazy load

}