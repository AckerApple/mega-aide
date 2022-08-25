# 🕹 megacade
Things learned and things to remember for my Megacade

👀 Documentation intended for Megacade with Omega drive built after 2021

**Table of contents**
- [👀 First time needs to know](#_first_time_needs_to_know)
- [🕹 How to map buttons](#_how_to_map_buttons)
  - [Mame arcade button mappings](#mame_arcade_button_mappings)
  - [⚪️ Trackball mapping](#_trackball_mapping)
- [👾 Emulator apps](#_emulator_apps)
- [✅ Fixed issues](_fixed_issues)
  - [🕹 Diagonals not working](#_diagonals_not_working)
  - [💡 Fix skipped lights during attract mode](#_fix_skipped_lights_during_attract_mode)
- [💥 LaunchBox to startup into a specific game](#_launchbox_to_startup_into_a_specific_game)
- [🎯 Issues chasing to fix](#_issues_chasing_to_fix)
- [⚡️ Issues with answers to perform](#_issues_with_answers_to_perform)

<a id="_first_time_needs_to_know"></a>
## 👀 First time needs to know

- ⚡️ The power "switch" is an arcade button. I was expecting a toggle switch, I've never seen an arcade button act as a power switch but there you go.
  - Hold down power button to force a shutdown when machine is unresponsive
- I had an exit button added, it works most everywhere but not everywhere
  - Be prepared to use trackball and left mouse button to exit those games
  - Or grab a keyboard
- ⌨️ 🐭 ❌ Avoid plugging in a keyboard with a trackpad/mouse
  - Can cause trackball games to confuse which device to use
- 💡 Do you have LEDBlinky controlled lights?
  - 💡 🕹 Do you have light up joysticks and they don't light up in games?
    - The joysticks may not be mapped to light up during game play
  - Use the LEDBlinky apps on the desktop. One app is to assign lights to joystick
    - Its a little complex at first but manageable
    - [🔗 📺 Direct timeline link](https://www.youtube.com/watch?v=29QG7Bd9mKw) to in-depth LEDBlinky controller app tutorial
- 🥷 Mortal Kombat 11 buttons were not working
  - I was told to turn off the Wii bar sensor and that fixed my issue
  - We only turn Wii bar on for Wii games now
- 🔫 Have Gun4Ir?
  - Check IR sensors on left and right of Tv screen for damage
    - Space is so small that they get damaged
    - Mine was broke. Called EHA and was sent, free of charge, replacement
  - The Gun4ir application was on the Windows start menu
    - Use it to test, config, and then "upload settings" with every change
    - Recommend moving icon to more convenient location like desktop
    - Recommend opening this app and not trust that the settings were done yet. The auto "detect" button seems to work well
- 🔓 The BigBox main menu "unlock" code was `1111` for my machine
- How to pair/add old Wii remotes I've always had
  - The Wii sensor bar has a pair button
  - The Wii remotes have a pair button behind the battery flap
- ⛳️ Golden Tee Complete 2006 is the latest golf in game that series, that the machine comes with
  - 📺 Two YouTube videos exist about getting new golf on
  - https://www.youtube.com/watch?v=9yEuSIpGc4Q
  - https://www.youtube.com/watch?v=VBP0wVxuuAM
- 🦌 Buck hunter arcade, aka Big Buck Hunter HD, only works 1 player
  - It so looks like player 2 will work but gun won't fire during gameplay
  - Feel lucky, most Megacades don't even work 1 player before 2022
  - Omega drive allows 1 Player as it comes with a game patch
- 💡 If you have lighted buttons, they do a good job of lighting by default but typically you will want to learn how to set the lighting by platform if not by some games
  - The lighting apps are fairly easily to navigate and are on the desktop
- 🕹 Many is not most games required controller mapping
  - See where I have learned how to map things [below](#_how_to_map_buttons)

<a id="_how_to_map_buttons"></a>
## 🕹 How to map buttons

For instance, Nintendo Switch Super Smash Brothers Ultimate only worked from the game controllers but I wanted to map to Megacade joystick/button console.

1. 👉 Goto the game needing mapping in LaunchBox/BigBox
2. 🪙 Press the Player 1 coin button
3. 🧾 A dedicated menu for the game itself should be presented
  - 🍀 If lucky, the second menu item is typically a configure menu item
  - 👾 Second option, is the emulator maybe listed there and using it often takes you to emulator to perform configurations
  - 🔦 You may have to figure out on your own where the emulator is within the operating system and open it manually
    - a list of known [👾 Emulator apps is here](#_emulator_apps) to help you figure out what to open

<a id="#mame_arcade_button_mappings"></a>
### Mame arcade button mappings
- While in the game, press player 1 + joystick right

<a id="#_trackball_mapping"></a>
### ⚪️ Trackball mapping

These steps are also helpful when your trackball stops working

- [📺 YouTube video direct timeline link](https://youtu.be/sLVBmAuJigY?t=346) to Mame mappings for Trackball
- While in the game, press player 1 + joystick right
- 👉 Goto input settings
- 🔦 Find Track X and Track Y and set them one at a time
- For Track X, roll trackball left and then right only
- For Track Y, roll trackball up and then down only
- Close menus, should be good to go
- HIGHLY recommended to run USB wire of trackball directly into computer


<a id="_emulator_apps"></a>
## 👾 Emulator apps

Sometimes Big Box doesn't launch the emulator when asked (Flip Box) or it doesn't list the emulater. Here are a few of the apps that allow you to configure the inputs

| System | Emulator Name |
|--- | --- |
| 🟥 Nintendo Switch | yuzu |
| 💠 PlayStation 3 | PCS3 |
| 🔴 Dreamcast | redream |

<a id="_fixed_issues"></a>
# ✅ Fixed issues

<a id="_diagonals_not_working"></a>
## 🕹 Diagonals not working

If your players are not allowing Diagonals, open the panel and move the restrictor plates (round dials that turn with 4 spring loaded screws). They are normally all set to 8-way for the 4 players normal joysticks but they may be turned to 4-way for some reason.

[j-stick-ball-top](https://www.ultimarc.com/arcade-controls/joysticks/j-stik-ball-top/)


<a id="_launchbox_to_startup_into_a_specific_game"></a>
### 💥 LaunchBox to startup into a specific game

Use cases:
- At my house, guests can turn on Megacade and get right into a game without learning menus
- You want the art package on megacade to match power on game
- You want the startup process to have a few workflows
  - You want the matching marquee to show to show with startup game
  - You have light up buttons and/or joysticks and want them to match the startup game
  - exiting game goes back into Launchbox

This process revolves around using a super great [Launchbox plugin](https://forums.launchbox-app.com/files/file/3267-big-box-auto-play/)

**Steps**
1. [Goto the autostart plugin download page](https://forums.launchbox-app.com/files/file/3267-big-box-auto-play/)
  - launchbox-app.com requires signup or signin to download
  - If you don't easily see a download button, you are not signed
  - Signup is painless
  - If in the far future you cannot get the file, try [filing an issue here](https://github.com/AckerApple/megacade/issues) and maybe I can help
2. Download the autostart plugin
3. Unzip the autostart plugin
  - ![📷 unzip the autostart plugin image should show here](assets/images/autostart/paste-files.png)
4. Open LaunchBox, NOT the one that launch on startup
  - I've never opened this launchbox app until adding this pluging so attaching screen cap
  - ![📷 open launchbox app image should show here](assets/images/autostart/open-launchbox.png)
5. Goto the tools menu in LaunchBox
  - ![📷 open launchbox tools image should show here](assets/images/autostart/goto-launchbox-tools.png)
6. Set your settings into the autostart
  - ☑️ Be sure to check the box "Select Game" otherwise video marquee may not come on
  - ![📷 autostart menu image should show here](assets/images/autostart/autostart-menu.png)
7. Restart machine or just your main BigBox... Whatever you do, Enjoy!
  - ![📷 autostart menu image should show here](assets/images/autostart/SmashBrosStartup.png)

<a id="_fix_skipped_lights_during_attract_mode"></a>
## 💡 Fix skipped lights during attract mode

When Megacade has lighted buttons/joysticks controlled by LEDBlinky and it sits untouched for a short time, it goes into an attract mode where the lighting "dances". If during this attract mode some lights are not lighting, such as my machine an entire joystick was not lighting, perform the following steps:

> 👀 The solution below is for when you know the lights are working, they just don't work during attract mode

1. Exit to Windows
2. Find the LEDBlinky app `LEDBlinkyAnimationEditor.exe`
  - On my machine, the app was in a Desktop folder shortcut labeled `LEDBlinky License goes here`
  - App should open with a main display that has a visual map of your buttons
3. To start fixing your attract mode animation, tap the "Animation" menu at top
4. Tap `Open...`
  - Hopefully the folder menu is targeted at a folder labeled "lwa"
  - Should be a path like `Administrator\LaunchBox\Tools\LEDBlinky\lwa`
5. If you are just trying to fix your attract mode lighting, open the file `zippy.lwax`
  - It's possible your attract animation is a different file
  - When you have opened the file, you can see what lights and also you can play the animation by find the ⏯ play/stop icon towards bottom left
6. Once you have confirmed you have the right animation file, edit the frames to add in your skipped light
  - You can navigate frame by frame, you can add frames
7. Save when complete and get back into big box and test your attract mode lighting, should be working now

<a id="_issues_chasing_to_fix"></a>
## 🎯 Issues chasing to fix

- Cannot play xBox games on the Megacade console joysticks/buttons
  - xEmu application allows me to set inputs to keyboard but I cannot remap the keys
  - I can only set one player to the keyboard. Keyboard cannot be shared across players
- 📺 I had a HDMI 2 with audio splitter, lets call it, added so I could connect additional devices and play audio through main speakers. It works but at half volume on any device I try. I have reviewed every LG tv setting on Tv and on every device. I cannot achieve high volume through megacade speakers from additional device
- 🎬 ❌ None of the items in "Movies" will play
  - The unite group gave me a reply: `Because there were no movies on Omega when given to Dave. Dave has since put them back on, but that’s on him to guide you. Give him a call.`
  - Contacted Dave and he mentioned a new drive coming out with more games and movies. May just wait for that. Hate to have broken movies folder. Will give this issue some more time.

<a id="_issues_with_answers_to_perform"></a>

## ⚡️ Issues with answers to perform

- ⛳️ The trackball/golf games keep forgetting my trackball time after time of reinputing it
  - `get your Motherboard drivers installed. Don't trust that EHA did that. Also run a direct USB cable from the trackball to the computer and bypass any hub. I had the same problem for years until I installed the MB drivers. Also, don't get an external keyboard with a touchpad. That can jack things up. If you do all of that it will be pretty solid until you unplug something. But it's going to be far more solid after you do all of the above`
- 💾 How do I save and load states to pick a game right back up?  
  - `For the emulators I’ve played (NES, SNES, TG-16, Genesis, Sega CD) F1 in game brings up the menu which includes save/load states`
