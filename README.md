# 🕹 megacade
Things learned and things to remember for my Megacade

👀 Documentation intended for Megacade with Omega drive built after 2021

**Table of contents**
- [👀 First time needs to know](#_first_time_needs_to_know)
- [🕹 How to map buttons](#_how_to_map_buttons)
- [👾 Emulator apps](#_emulator_apps)
- [✅ Fixed issues](_fixed_issues)
  - [🕹 Diagonals not working](#_diagonals_not_working)
  - [💡 Fix skipped lights during attract mode](#_fix_skipped_lights_during_attract_mode)
- [🎯 Issues chasing to fix](#_issues_chasing_to_fix)
  - [💥 LaunchBox to startup into a specific game](#_launchbox_to_startup_into_a_specific_game)
- [⚡️ Issues with answers to perform](#_issues_with_answers_to_perform)

<a id="_first_time_needs_to_know"></a>
## 👀 First time needs to know

- Avoid plugging in a keyboard with a trackpad/mouse
  - Can cause trackball games to confuse which device to use
- Mortal Kombat 11 buttons were not working
  - I was told to turn off the Wii bar sensor and that fixed my issue
  - We only turn Wii bar on for Wii games now
- How to add old Wii remotes I've always had
  - The Wii sensor bar has a pair button
  - The Wii remotes have a pair button behind the batter flap
- The power "switch" is an arcade button. I was expecting a toggle switch, I've never seen an arcade button act as a power switch but there you go.
  - Hold down power button to force a shutdown when machine is unresponsive
- Check IR sensors on left and right of Tv screen
  - Space is so small that they get damaged
  - Called EHA and was sent, free of charge, replacement
- The BigBox main menu unlock code was `1111` for my machine
- To fix arcade button mapping issues
  - Press player 1 + joystick right
  - Trackball issues? Goto controller settings
    - find Track X and Track Y and set them one at a time
    - For Track X roll trackball left and then right only
    - For Track Y roll trackball up and then down only
- Buck hunter arcade, aka Big Buck Hunter HD, only works 1 player
  - It so looks like player 2 will work but gun won't fire during gameplay
  - Feel lucky, most Megacades don't even work 1 player before 2022 (Omega drive allows 1 Player)
- I have Gun4IR and the app was on the Windows start menu
  - Use it to test, config, and then "upload settings" with every change

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

- 📺 I had a HDMI 2 with audio splitter, lets call it, added so I could connect additional devices and play audio through main speakers. It works but at half volume on any device I try. I have reviewed every LG tv setting on Tv and on every device. I cannot achieve high volume through megacade speakers from additional device
- 🎬 ❌ None of the items in "Movies" will play
  - The unite group gave me a reply: `Because there were no movies on Omega when given to Dave. Dave has since put them back on, but that’s on him to guide you. Give him a call.`
  - Contacted Dave and he mentioned a new drive coming out with more games and movies. May just wait for that. Hate to have broken movies folder. Will give this issue some more time.

<a id="_launchbox_to_startup_into_a_specific_game"></a>
### 💥 LaunchBox to startup into a specific game
- Use case: My house guests can turn on Megacade and get right into a game without the hassle of learning the menus
- 🔎 Internet searches reveal seemingly no one has figured it out
- 🔎 Github searches show quite a lot for LaunchBox plugins
  - [Some interesting code examples here](https://github.com/slipsystem/LaunchBox-Plugin-Examples#interfaces-2)
- When game exited it should go right into LaunchBox
- 🎁 LaunchBox itself has a plugin system that with events that sounds promising
  - [SystemEventTypes](https://pluginapi.launchbox-app.com/html/3e3603e5-bab6-e510-689c-ee35c0f5f694.htm) Class has the event `BigBoxStartupCompleted`
  - [Plugins Namespace](https://pluginapi.launchbox-app.com/html/9c73b065-c834-0d8b-4255-0050ef68ab42.htm)
  - 
- 🤖 A automation script that presses keyboard keys and waits between presses is here
  - https://forums.launchbox-app.com/topic/62549-big-box-auto-launch-into-specific-game-at-startup/
  - I think this is a bad approach that will need maintenance over time and not work we 

<a id="_issues_with_answers_to_perform"></a>

## ⚡️ Issues with answers to perform

- ⛳️ The trackball/golf games keep forgetting my trackball time after time of reinputing it
  - `get your Motherboard drivers installed. Don't trust that EHA did that. Also run a direct USB cable from the trackball to the computer and bypass any hub. I had the same problem for years until I installed the MB drivers. Also, don't get an external keyboard with a touchpad. That can jack things up. If you do all of that it will be pretty solid until you unplug something. But it's going to be far more solid after you do all of the above`
- 💾 How do I save and load states to pick a game right back up?  
  - `For the emulators I’ve played (NES, SNES, TG-16, Genesis, Sega CD) F1 in game brings up the menu which includes save/load states`