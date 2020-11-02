# mixxx midi mappings

MIDI mappings for the [mixxx](https://www.mixxx.org/) DJ software.

## Supported hardware

### Single decks

- [Denon SC3900](src/single-deck/Denon-SC3900)

## Installation

First, clone the project.

Then, run :

```bash
$ make
```

It will build the mapping from the [`src`](src) dir into the [`dist`](dist) dir,
and then install the built files in the `controllers` directory of your mixxx
path (defaults to `~/.mixxx`). If you're using another mixxx path, specify it
during the `make` call :

```bash
# e.g. if you have installed mixxx via flatpak :
$ MIXXX_PATH=~/.var/app/org.mixxx.Mixxx/.mixxx make
```

This installation method is meant for GNU/Linux hosts, but should be able to
run on MacOS too. If you're a Windows user, you can try to run it with WSL,
or manually copy the `src` files to the right place.

### Details for single decks

If you plan to use more than two decks, change the `SINGLE_DECKS_COUNT` var
before building the mapping files :

```bash
$ SINGLE_DECKS_COUNT=4 make
```

It will generate one XML file per deck (one per MIDI channel).

## mixxx configuration

### Single decks

Open mixxx, and go to the controller settings. For each of your decks, load the
mapping file matching the MIDI channel of your deck.

Channel1 is for Deck1, Channel2 is for Deck2, and so on.

Also, make sure to configure your hardware to send and receive MIDI signals on
the appropriate channel.
