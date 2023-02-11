import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core"
import { firstValueFrom } from "rxjs"
import { addXInputToGame } from "../launchbox/games.utils"
import { AdditionalApp, GameInsight, PlatformInsights } from "../session.provider"
import { XArcadeXInputProvider } from "./XArcadeXInput.provider"

@Component({
  selector: 'xinput-app-map-select',
  templateUrl: './xinput-app-map-select.html',
  exportAs: 'xinputAppMapSelect'
}) export class xinputAppMapSelectComponent {
  @Input() game!: GameInsight
  @Input() platform!: PlatformInsights

  @Input() model?: AdditionalApp
  @Output() modelChange = new EventEmitter<AdditionalApp>()
  
  @Output() change = new EventEmitter<{previousValue: string, currentValue:string}>()
  
  
  mapping!: string

  constructor(public xarcade: XArcadeXInputProvider) {}

  ngOnChanges( _changes: SimpleChanges ){
    this.mapping = this.model ? getCommandMapByAdditionalApp(this.model) : ''
  }

  async applyGameCommandMapping(currentValue: string) {
    if ( !this.model ) {
      const dir = await firstValueFrom(this.xarcade.directory$)
      const apps = addXInputToGame(this.game, this.platform, dir.path)
      this.model = apps[0] // the first one is the main
      this.game.xInput = {
        app: this.model,
        mapping: currentValue,
      }
    }

    applyGameCommandMapping(this.model, currentValue)
    this.change.emit({
      previousValue: this.mapping,
      currentValue,
    })
    this.mapping = currentValue
  }
}

export function applyGameCommandMapping(
  app: AdditionalApp,
  mapping: string
): AdditionalApp {
  let commandElement = app.commandLineElement

  if ( !commandElement ) {
    commandElement = app.commandLineElement = document.createElement('CommandLine')
    app.element.appendChild(app.commandLineElement)
  }

  const command = commandElement?.textContent || ''
  const newCommand = setCommandMapping(command, mapping)
  
  commandElement.textContent = newCommand
  app.details.commandLine = newCommand

  return app
}

export function setCommandMapping(
  command: string,
  mapping: string
) {
  const args = getCommandArgs(command)
  const mapIndex = args?.findIndex(item => item.includes('--mapping')) as number
  if ( mapIndex < 0 || mapIndex >= args.length-1 ) {
    return command + ' --mapping ' + commandSafeArg(mapping)
  }

  args[ mapIndex + 1 ] = commandSafeArg(mapping)

  return args.join(' ')
}

function getCommandArgs(command: string): string[] {
  return command.match(/("[^"]+"|[^\s"]+)/gmi) || []
}

export function getCommandMapping(command: string): string {
  const args = getCommandArgs(command)
  const mapIndex = args?.findIndex(item => item.includes('--mapping')) as number
  if ( mapIndex < 0 || mapIndex >= args.length-1 ) {
    return ''
  }

  return args[ mapIndex + 1 ].replace(/"/g, '')
}

function commandSafeArg(commandArg: string): string {
  if ( !commandArg.includes(' ') ) {
    return commandArg
  }

  return '"' + commandArg + '"'
}

export function getCommandMapByAdditionalApp(model: AdditionalApp) {
  const command = model.details.commandLine
  return command ? getCommandMapping(command) : ''  
}
