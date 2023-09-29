import { LedControllerDetails } from "./LedBlinky.utils"
import { Port } from "./LedPort.class"
import { updateElementAttributes } from "./element.utils"

export class ElementDetails {
  debug?: boolean

  constructor(
    public element: Element,
    public details: Record<string, any>,
  ) {}

  updateDetails() {
    updateElementAttributes(this.element, this.details)
  }
}

export class LedController extends ElementDetails {
  constructor(
    public override element: Element,
    public override details: LedControllerDetails,
    public ports: Port[],
  ) {
    super(element, details)
  }
}
