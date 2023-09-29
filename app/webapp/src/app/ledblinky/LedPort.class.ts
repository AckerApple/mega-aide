import { ElementDetails } from "./LEDController.class"
import { PortDetails } from "./LedBlinky.utils"

export class Port extends ElementDetails {
  constructor(
    public override element: Element,
    public override details: PortDetails,
  ) {
    super(element, details)
  }
}
