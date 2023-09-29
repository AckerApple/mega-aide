import { Component, EventEmitter, Input, Output } from "@angular/core";
import { SessionProvider } from "../session.provider";
import { AdditionalApp, AdditionalAppDetails, GameInsight, PlatformInsights } from "../session.utils"
import { firstValueFrom } from 'rxjs'
import { removeAppFromApps } from './LaunchBox.class'
import { Prompts } from "ack-angular";

@Component({
  selector: 'additional-apps-table',
  templateUrl: './additional-apps-table.component.html',
}) export class AdditionalAppsTableComponent {
  @Input() apps: AdditionalApp[] = []
  @Input() game!: GameInsight
  @Input() platform!: PlatformInsights
  @Output() save = new EventEmitter<void>()

  constructor(
    public prompts: Prompts,
    public session: SessionProvider,
  ) {}
  
  async removeAppFromApps(app: AdditionalApp, apps: AdditionalApp[]) {
    const confirm = await firstValueFrom(
      this.prompts.confirm('remove additional app')
    )
  
    if ( confirm ) {
      removeAppFromApps(app, apps)
    }
  }  

  toggleAppSkipUi(app: AdditionalAppDetails) {
    const commandLine = app.commandLine as string
    const skip = commandLine.includes('--skip-ui')

    if ( skip ) {
      app.commandLine = commandLine.replace(/--skip-ui([ ])*/,'')
    } else {
      app.commandLine = '--skip-ui ' + commandLine
    }
    
    this.save.emit()
  }

  applyAppCommandLine(app: AdditionalApp) {
    const element = app.element.getElementsByTagName('CommandLine')[0]
    element.textContent = app.details.commandLine as string
    this.save.emit()
  }
    
  applyAppApplicationPath(app: AdditionalApp) {
    const element = app.element.getElementsByTagName('ApplicationPath')[0]
    element.textContent = app.details.applicationPath as string
    this.save.emit()
  }  
}
