import { GameInsight, PlatformInsights, XInputGameInsight } from "../session.provider"
import { applyGameCommandMapping } from "../xarcade-xinput/xinput-app-map-select.component"
import { addXInputToGame } from "./games.utils"

export function changePlatformGameCommandMappings(
  maps: GameInsight[],
  platform: PlatformInsights,
  xarcadePath: string,
  mapping?: string | null,
) {
  maps.forEach(x => {
    let xInput = x.xInput as XInputGameInsight

    if ( mapping && !xInput ) {
      const newApp = addXInputToGame(x, platform, xarcadePath)
      xInput = x.xInput = {app: newApp[0], mapping: mapping}
    }

    xInput.mapping = mapping || ''
    applyGameCommandMapping(xInput.app, xInput.mapping)
  })
}
