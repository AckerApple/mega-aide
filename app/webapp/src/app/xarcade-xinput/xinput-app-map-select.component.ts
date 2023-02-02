import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core"
import { AdditionalApp } from "../session.provider"

@Component({
  selector: 'xinput-app-map-select',
  templateUrl: './xinput-app-map-select.html',
  exportAs: 'xinputAppMapSelect'
}) export class xinputAppMapSelectComponent {
  @Input() model!: AdditionalApp
  // @Output() modelChange = new EventEmitter<AdditionalApp>()
  @Output() change = new EventEmitter<{previousValue: string, currentValue:string}>()
  mapping!: string

  ngOnChanges( _changes: SimpleChanges ){
    this.mapping = this.model ? getCommandMapping(this.model.commandLine) : ''
  }

  applyGameCommandMapping(currentValue: string) {
    applyGameCommandMapping(this.model, currentValue)
    this.change.emit({
      previousValue: this.mapping,
      currentValue,
    })
    this.mapping = currentValue
  }
}

export function applyGameCommandMapping(
  appDetails: AdditionalApp,
  mapping: string
) {
  const commandElement = appDetails.commandLineElement
  const command = commandElement.textContent as string
  const newCommand = setCommandMapping(command, mapping)
  
  appDetails.commandLineElement.textContent = newCommand
  appDetails.commandLine = newCommand
}

export function setCommandMapping(command: string, mapping: string) {
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
