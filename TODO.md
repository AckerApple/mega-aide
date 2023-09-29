TODO: 

💾 File saving:
- add checkbox when multiple files for save. Don't save unchecked
- add ability to remove a file from being saved
- support per file warning such as "LEDBlinky will need to be restarted"

💿 Backups
- Need backups using file streaming
- Previews need to be streamed
  - will need to figure out scrolling (maybe do a line count before display?)

Change to Native Install apps:
- If hard-drive size can be looked up we can warn of low disk space
  - On the detect issues page
  - EHA machines are backed to the brim and LaunchBox starts throwing generic "The Application object is being shut down
- We could scan for folders
- Maybe the only way we can load media spread across multiple drives is native app

LEDBlinky:LAYOUTS

LEDBlinky:InputMap
- need to compare with existing LEDBlinky app
- Most inputs could be selectable if we had proper available values.
  - However, the selectable values most likely come from computer device lookup which would require a native web app

LEDBlinky:Controls
- Test configuration
  - Start with message of coming soon and then work our way up into implementing it
- Drag drop undefined n/a lights
  - drop them onto a layout light and auto config for that light
  - warn when cannot auto configure?
- Check support for <control>:
  - primaryControl: 0 || 1
  - alwaysActive: 0 || 1
- "hide games with default controls"?
- Import MAME by ROM name?

🌜 DREAMS
- small printable format of various button mappings for systems
  - intended to be printed and visible on arcade button panel
