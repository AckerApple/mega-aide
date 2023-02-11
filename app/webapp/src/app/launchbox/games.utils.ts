import { AdditionalApp, AdditionalAppType, GameInsight, PlatformInsights } from "../session.provider"

function newTextElementOn(type: string, text: string, on: Element) {
  const element = createElement(type)
  element.textContent = text
  on.appendChild(element)
  return { text, element }
}

function createElement(tagName: string): Element {
  const doc = new DOMParser().parseFromString(`<${tagName}></${tagName}>`, 'text/xml')
  return doc.children[0]
}

function uuidv4() {
  const first = [1e7] as any
  const formula = (first+-1e3+-4e3+-8e3+-1e11)
  return formula.replace(/[018]/g, (c: any) =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function newXinputApp(
  game: GameInsight,
  platform: PlatformInsights,
  xarcadePath: string,
): AdditionalApp {
  const id = game.details.id
  const xinputApp = getNewXinputApp(id, xarcadePath)
  const platformXml = platform.xml
  
  // add new app right into the platform file, right now
  const firstElm = platformXml.getElementsByTagName('LaunchBox')[0]
  firstElm.appendChild(xinputApp.element)

  game.additionalApps = game.additionalApps || []
  game.additionalApps.push(xinputApp)
  
  return xinputApp
}

function getNewApp({
  applicationPath, name, type,
  commandLine, gameId,
  autoRunAfter, autoRunBefore,
}: {
  applicationPath: string
  name: string
  gameId: string
  commandLine: string
  autoRunAfter: string
  autoRunBefore: string
  type: AdditionalAppType
}): AdditionalApp {
  const newApp = createElement('AdditionalApplication')
 
  /** Things possibly missing:
    <GogAppId/>
    <OriginAppId/>
    <OriginInstallPath/>
    <UseDosBox>false</UseDosBox>
    <UseEmulator>false</UseEmulator>
    <Developer/>
    <Publisher/>
    <Region/>
    <Version/>
    <Status/>
    <EmulatorId/>
    <SideA>false</SideA>
    <SideB>false</SideB>
    <Priority>0</Priority>
  */
  newTextElementOn('ID', uuidv4(), newApp)
  newTextElementOn('GameID', gameId, newApp)
  newTextElementOn('PlayCount', '0', newApp)
  newTextElementOn('PlayTime', '0', newApp)
  newTextElementOn('WaitForExit', 'false', newApp)
  const {element: applicationPathElement} = newTextElementOn('ApplicationPath', applicationPath, newApp)
  const {element: nameElement} = newTextElementOn('Name', name, newApp)
  const {element: commandLineElement} = newTextElementOn('CommandLine', commandLine, newApp)
  const {element: autoRunAfterElement} = newTextElementOn('AutoRunAfter', autoRunAfter, newApp)
  const {element: autoRunBeforeElement} = newTextElementOn('AutoRunBefore', autoRunBefore, newApp)

  return {
    element: newApp,
    autoRunAfterElement,
    autoRunBeforeElement,
    nameElement,
    applicationPathElement,
    commandLineElement,
    
    details: {
      type,
      autoRunAfter,
      autoRunBefore,
      name,
      applicationPath,
      commandLine,
    }
  }
}

function getNewXinputApp(
  gameId: string,
  xarcadePath: string
): AdditionalApp {    
  return getNewApp({
    gameId,
    applicationPath: xarcadePath+'/xarcade-xinput/XArcade XInput.exe',
    name: 'xinput',
    type: AdditionalAppType.XINPUT,
    commandLine: '--skip-ui',
    autoRunAfter: 'false',
    autoRunBefore: 'true'
  })
}

function newKillXinputApp(
  gameId: string,
  xarcadePath: string,
): AdditionalApp {
  return getNewApp({
    gameId,
    applicationPath: xarcadePath + '/xarcade-xinput/kill xinput.exe',
    name: 'kill xinput',
    type: AdditionalAppType.XINPUT_KILL,
    commandLine: '',
    autoRunAfter: 'true',
    autoRunBefore: 'false'
  })
}

function addXInputKillToGame(
  game: GameInsight,
  platform: PlatformInsights,
  xarcadePath: string
): AdditionalApp {
  const platformXml = platform.xml
  const firstElm = platformXml.getElementsByTagName('LaunchBox')[0]
  const killXinputApp = newKillXinputApp(game.details.id, xarcadePath)
  firstElm.appendChild(killXinputApp.element)
  
  game.additionalApps = game.additionalApps || []
  game.additionalApps.push(killXinputApp)
  
  return killXinputApp
}

export function addXInputToGame(
  game: GameInsight,
  platform: PlatformInsights,
  xarcadePath: string
) {
  const xinputApp = newXinputApp(
    game,
    platform,
    xarcadePath
  )
  const killApp = addXInputKillToGame(
    game,
    platform,
    xarcadePath,
  )

  return [xinputApp, killApp]
}