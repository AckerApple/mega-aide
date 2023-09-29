import { ControlGroup, NewControlGroup } from "./ControlGroup.class"

export interface NewControlGroupings {
  groupName: string
  voice?: string
  controlGroups: NewControlGroup[]
}

export interface ControlGroupings extends NewControlGroupings {
  controlGroups: ControlGroup[]
}
