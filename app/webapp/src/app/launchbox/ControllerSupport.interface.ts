export interface ControllerSupportDetails {
  controllerId: string
  gameId: string
  supportLevel?: string
}

export interface ControllerSupport {
  element: Element
  details: ControllerSupportDetails
  
  controllerIdElement: Element
  gameIdElement: Element
  supportLevelElement?: Element
}
