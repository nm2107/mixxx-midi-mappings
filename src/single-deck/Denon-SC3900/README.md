# Denon SC3900

Here is the MIDI mapping for the [Denon SC3900](https://www.youtube.com/watch?v=jQY0YkwT-E8)
multimedia player.

Refer to the general [README](/README.md) to know how to install this mapping.

## Deck configuration

If you're using a Windows or a GNU/Linux computer, you should set the SC3900
deck to `PC MODE`.

For MacOS users, set it to `MAC`.

Then, make sure to set the SC3900 MIDI channel to the one matching the deck on
mixxx.

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
