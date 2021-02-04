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

- `VINYL` mode button : let you choose whether the wheel acts like a vinyl
(and so allows you to scratch), or like a classic jog wheel.
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
- Jump forward (`Fast Search` forward button)
- Jump backward (`Fast Search` backward button)
- Increase or decrease the forward and backward jump size (`Track search` `-`
and `+` buttons)
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

The normal MIDI mode is not supported by this mapping due to the lack of
precision when setting the platter rotation speed when enabling scratching.

There was an attempt to support it on [this branch](https://github.com/nm2107/mixxx-midi-mappings/tree/feat/SC3900-normal-midi-mode-partial-support),
but it's quite unusable as the SC3900 unit can't set the platter rotation speed
with a precision below 1% RPM (see [this pull request](https://github.com/nm2107/mixxx-midi-mappings/pull/1) for more details).

## Hybrid MIDI mode

This is the mode which should be used with this mapping.

The hybrid MIDI mode requires that you use a sound card which will listen to
the audio output of the SC3900 in order to determine the playback speed.

It is the similar principle that is used for DVS, so you should activate the
vinyl control setting in mixxx.

The following inputs are managed by the SC3900 deck itself when in hybrid MIDI
mode :

- Play/pause button
- Vinyl mode button
- Vinyl disc and platter
- Pitch slider and +/- pitch bend buttons
- Reverse button
- Platter start and end time potentiometers
