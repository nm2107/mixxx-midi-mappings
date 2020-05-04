# Denon SC3900

Here is the MIDI mapping for the [Denon SC3900](https://www.youtube.com/watch?v=jQY0YkwT-E8)
multimedia player.

Refer to the general [README](/README.md) to know how to install this mapping.

*Table of contents :*

- [Deck configuration](#deck-configuration)
- [Features](#features)
- [Normal MIDI mode](#normal-midi-mode)
- [Hybrid MIDI mode](#hybrid-midi-mode)

## Deck configuration

If you're using a Windows or a GNU/Linux computer, you should set the SC3900
deck to `PC MODE`.

For MacOS users, set it to `MAC`.

Then, make sure to set the SC3900 MIDI channel to the one matching the deck on
mixxx.

## Features

Here are the features available in both normal and hybrid MIDI modes :

- 33 1/3 RPM platter (you can edit the `.js` file to change it to 45 RPM)
- Track eject (mapped on the USB eject button as the disc eject button would
attempt to eject the CD medium when pressed)
- Auto loop (aka beatgrid loop)
- Loop size halve
- Loop size double
- `A` loop point set
- `B` loop point set
- Loop exit / reloop
- 8 hotcues :
    - 4 on MIDI BANK 1
    - 4 on MIDI BANK 2
    - Ability to clear the hotcues one by one (hold down `CLR` button then
select the hotcue to clear)
- Search forward (`Fast Search` forward button)
- Search backward (`Fast Search` backward button)
- Reverse playback
- Dump playback (aka slip playback)
- CUE
- Play/pause
- BPM Sync (short press toggles the sync, long press set the deck as sync
master)
- Select knob :
    - counter clock wise : move selection up
    - clock wise : move selection down
    - pressed : select highlighted row
- Back button : move focus on the left
- Forward button : move focus on the right
- Single/Cont. button : toggles track repeat
- Shift lock button : toggles beatgrid lock
- Pitch fader
- Pitch bend + button
- Pitch bend - button
- Key lock (`Key adjust` button)
- BPM tap (tapping)

## Normal MIDI mode

In normal MIDI mode, the platter never rotates (it is by design, and the
VINYL button has no effect neither), so the vinyl disc acts like a jog wheel
during playback.

When the playback is paused and the vinyl disc is rotated, scratching is
activated to be able to navigate through the track.

## Hybrid MIDI mode

In hybrid MIDI mode, when the VINYL mode is on, scratching is enabled (and
the platter is rotating).
When the VINYL mode is off, the vinyl disc acts like a jog wheel.

In hybrid MIDI mode, the SC3900 unit doesn't send any MIDI messages during the
vinyl disc manipulation (neither when the playback is running).
Instead, the unit is sending an audio signal that should be used for DVS.
