// This is just a sample app. You can structure your Neutralinojs app code as you wish.
// This example app is written with vanilla JavaScript and HTML.
// Feel free to use any frontend framework you like :)
// See more details: https://neutralino.js.org/docs/how-to/use-a-frontend-library

function openDocs() {
  Neutralino.os.open("https://neutralino.js.org/docs");
}

function openTutorial() {
  Neutralino.os.open("https://www.youtube.com/watch?v=txDlNNsgSh8&list=PLvTbqpiPhQRb2xNQlwMs0uVV0IN8N-pKj");
}

function setTray() {
  if(NL_MODE != "window") {
    console.log("INFO: Tray menu is only available in the window mode.");
    return;
  }
  let tray = {
    icon: "/resources/icons/trayIcon.png",
    menuItems: [
      {id: "VERSION", text: "Get version"},
      {id: "SEP", text: "-"},
      {id: "QUIT", text: "Quit"}
    ]
  };
  Neutralino.os.setTray(tray);
}

function onTrayMenuItemClicked(event) {
  switch(event.detail.id) {
    case "VERSION":
      Neutralino.os.showMessageBox("Version information",
        `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}`);
      break;
    case "QUIT":
      Neutralino.app.exit();
      break;
  }
}

function onWindowClose() {
  Neutralino.app.exit();
}

Neutralino.init();

Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

// setTray();
if(NL_OS != "Darwin") { // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
  setTray();
}

// setTimeout(showInfo, 1000)

// monitor keyboard quick keys - (fixes Mac which currently is not respecting quick keys)
window.addEventListener('keydown', (event) => {
  const wasCommandUsed = event.metaKey === true // was command held
  if ( wasCommandUsed ) {
    switch(event.which) {
      case 81: // q
      case 87: // w
        return Neutralino.app.exit()
      case 86: // v
        return document.execCommand('paste')
      case 65: // a - select all
        return document.activeElement.select()
      case 67: // c
        return document.execCommand('copy')
      case 88: // x
        return document.execCommand('cut')
      case 82: // r - refresh
        return location.reload()
    }
  }
})
