# Denon SC3900

Here is the MIDI mapping for the [Denon SC3900](https://www.youtube.com/watch?v=jQY0YkwT-E8)
multimedia player.

Refer to the general [README](/README.md) to know how to install this mapping.

*Table of contents :*

- [Deck configuration](#deck-configuration)
- [Mapping configuration](#mapping-configuration)
- [Features](#features)
- [Normal MIDI mode](#normal-midi-mode)
- [Hybrid MIDI mode](#hybrid-midi-mode)
- [Undocumented MIDI addresses](#undocumented-midi-addresses)

## Deck configuration

If you're using a Windows or a GNU/Linux computer, you should set the SC3900
deck to `PC MODE`.

For MacOS users, set it to `MAC`.

Then, make sure to set the SC3900 MIDI channel to the one matching the deck on
mixxx.

## Mapping configuration

There are some configuration variables that you may change depending on the
way you want to use your SC3900.
These variables are declared in the [`scripts.js`](./scripts.js) file.

- `DenonSC3900.MIDI_MODE` : the MIDI mode you used to connect the SC3900 to the
computer. Can be `normal` or `hybrid`. Defaults to `normal`.
- `DenonSC3900.PLATTER_RPM` : use the same setting than on your SC3900.
Defaults to `33 + 1/3`.
- `DenonSC3900.JOG_WHEEL_PITCH_BEND_SENSIBILITY` : the sensibility of the vinyl
disc when used as a jog wheel. Only considered in `normal` MIDI mode. Set it to
a positive float (> 1 is more sensible, < 1 is less sensible). Defaults to
`1.0`.

All the other variables should remain unchanged.

## Features

Here are the features available in both normal and hybrid MIDI modes :

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

In normal MIDI mode, the start and stop times potentiometers aren't considered,
as there's no way to influence on the platter rotation speed via MIDI (or at
least not that I know).

The platter is either rotating at the normal speed, or stopped. Unfortunately
the SC3900 doesn't have a MIDI address to set the platter speed precisely (i.e.
to reflect the pitch rate). The only scale we can apply to the platter is
1% RPM changes (see [this pull request](https://github.com/nm2107/mixxx-midi-mappings/pull/1))
for more details.

## Hybrid MIDI mode

The hybrid MIDI mode requires that you use a sound card which will listen to
the audio output of the SC3900 in order to determine the playback speed.

It is the similar principle that is used for DVS.

The following inputs are managed by the SC3900 deck itself when in hybrid MIDI
mode :

- Play/pause button
- Vinyl mode button
- Vinyl disc and platter
- Pitch slider and +/- pitch bend buttons
- Reverse button
- Platter start and end time potentiometers

## Undocumented MIDI addresses

There are some MIDI addresses that aren't documented in the Denon manual
(`V00`).

However here are some that I found :

| Item                       |      Addres   |  Value                                       |
|----------------------------|:-------------:|----------------------------------------------|
| [Platter start / stop](https://github.com/matthias-johnson/SC3900/blob/d63aaf89f08d1e2d5ffe9042e22adf28a0a27f36/SC3900-scripts.js#L54) |  `0x66` (102)   | `0` : stop, `127` : start |
| Platter rotation direction |  `0x67` (103) | `0` : clock wise, `127` : counter clock wise |
| Platter speed increse | `0x68` (104) | 0-100 : increase the platter RPM from the given value (in %) from the base RPM |
| Platter speed decrease | `0x68` (104) | 0-70 : decrease the platter RPM from the given value (in %) from the base RPM |

For each of these address, the `Command` (i.e. first MIDI 7bit block) is `0xBn`
where `n` is the MIDI channel ([0-15]).

Unfortuately it does not seem to have addresses to set the platter speed with
precision (i.e. on a `0.01%` scale) :( .
