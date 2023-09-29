import { Emulator } from "./Emulator.class"
import { LedBlinkyControls } from "./LedBlinky.utils"

export interface EmulatorControls {
  emulator: Emulator // NewEmulator
  controls: LedBlinkyControls // file details
}
