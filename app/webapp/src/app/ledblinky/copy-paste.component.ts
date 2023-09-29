import { Component, EventEmitter, Input, Output } from "@angular/core"
import { copyToClipboard } from "../app.utilities"

@Component({
  selector: 'copy-paste',
  templateUrl: './copy-paste.component.html',
}) export class CopyPasteComponent {
  @Input() model!: any
  @Output() modelChange = new EventEmitter<any>()


  copy() {
    copyToClipboard(this.model)
  }

  async paste() {
    try {
      // Request permission to access the clipboard
      const text = await navigator.clipboard.readText()
      this.modelChange.emit(this.model = text)
    } catch (error) {
      alert('Browser failed to read clipboard')
    }
  }
}
