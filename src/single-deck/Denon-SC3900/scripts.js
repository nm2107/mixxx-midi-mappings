// @see https://manual.mixxx.org/2.3/en/chapters/appendix/mixxx_controls.html
// @see https://github.com/mixxxdj/mixxx/wiki/MIDI-Controller-Mapping-File-Format

// Script written using a DenonSC3900 deck with firmware version 1168.
// @see https://denondjforum.com/t/attention-sc3900-software-sys-1168-nov-2014/112
function DenonSC3900 () {}

// @see Denon SC3900 manual for hex values, on page 34.
DenonSC3900.LIGHT_ON = 0x4A
DenonSC3900.LIGHT_OFF = 0x4B

DenonSC3900.AUTO_LOOP_WRITE_ADDRESS = 0x2B
DenonSC3900.A_LOOP_LIGHT_WRITE_ADDRESS = 0X24
DenonSC3900.B_LOOP_LIGHT_WRITE_ADDRESS = 0X40

DenonSC3900.HYBRID_MIDI_LOOP_HALVE_VALUE = 0x7F
DenonSC3900.HYBRID_MIDI_LOOP_DOUBLE_VALUE = 0x00

DenonSC3900.HOTCUES_WRITE_ADDRESSES = {
    1: {
        light: 0x11,
        dimmer: 0x12
    },
    2: {
        light: 0x13,
        dimmer: 0x14
    },
    3: {
        light: 0x15,
        dimmer: 0x16
    },
    4: {
        light: 0x17,
        dimmer: 0x18
    },
    5: {
        light: 0x31,
        dimmer: 0x32
    },
    6: {
        light: 0x33,
        dimmer: 0x34
    },
    7: {
        light: 0x35,
        dimmer: 0x36
    },
    8: {
        light: 0x37,
        dimmer: 0x38
    }
}

DenonSC3900.SYNC_WRITE_ADDRESS = 0x52
DenonSC3900.KEY_ADJUST_WRITE_ADDRESS = 0x08
DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS = 0x59
DenonSC3900.SELECT_WRITE_ADDRESS = 0x1E

DenonSC3900.LONG_PRESS_THRESHOLD_MS = 500;

// @see https://manual.mixxx.org/2.3/en/chapters/appendix/mixxx_controls.html
DenonSC3900.BEATJUMP_SIZES = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
// Mixxx uses a default beatjump size of 4, but we're using 32 here to ease
// track navigation.
DenonSC3900.BEATJUMP_SIZE_DEFAULT = 32;

// #############################################################################
// ## Utilities
// #############################################################################

/**
 * @param number inputChannel (0 based)
 *
 * @return string
 */
DenonSC3900.inputChannelToGroupName = function (inputChannel) {
    var groupNumber = inputChannel + 1;

    return "[Channel" + groupNumber + "]";
}

/**
 * @param number inputChannel (0 based)
 *
 * @return number (hex)
 */
DenonSC3900.getOutputMidiChannel = function (inputChannel) {
    // As specified in the Denon manual : signals must be sent on 0xBn where
    // n is the channel number [0-15].
    return 0xB0 + inputChannel;
}

/**
 * @return int The current timestamp, in miliseconds.
 */
DenonSC3900.getTimestampMs = function () {
    return Date.now();
}

/**
 * @return int The number of mixxx decks.
 */
DenonSC3900.getDecksCount = function () {
    return engine.getValue("[Master]", "num_decks")
}

/**
 * @return int The number of hotcues supported by the SC3900
 */
DenonSC3900.getHotcuesCount = function () {
    return Object.keys(DenonSC3900.HOTCUES_WRITE_ADDRESSES).length
}

/**
 * @param string group
 * @param int hotcueNumber
 *
 * @return bool
 */
DenonSC3900.isHotcueSet = function (group, hotcueNumber) {
    var valueName = "hotcue_" + hotcueNumber + "_position";

    return -1 !== engine.getValue(group, valueName);
}

/**
 * @param string group
 *
 * @return bool
 */
DenonSC3900.isPlaying = function (group) {
    return engine.getValue(group, "play");
}

/**
 * @param string group
 * @param float cursorWindow The additional cursor window width to consider
 *                           to determine cursor position, in seconds.
 *                           I.e. this function will return whether the cursor
 *                           is on the cuepoint plus or minus this window.
 *                           Defaults to 0.0 second.
 *
 * @return bool
 */
DenonSC3900.isCursorOnCuePoint = function (group, cursorWindow = 0.0) {
    // the CUE point position, in samples
    var cuePointPosition = engine.getValue(group, "cue_point");

    // the position of the cursor in the track [0-1]
    var cursorPositionRate = engine.getValue(group, "playposition");
    // the amount of samples in the track
    var trackSamplesCount = engine.getValue(group, "track_samples");
    // the track sample rate, in Hz
    var trackSampleRate = engine.getValue(group, "track_samplerate");

    // the cursor position, in samples
    var cursorPosition = cursorPositionRate * trackSamplesCount;

    // the amount of samples between the cursor and the cuepoint
    var distance = Math.abs(cuePointPosition - cursorPosition);

    // the duration of the distance, in seconds
    var distanceDuration = distance / trackSampleRate;

    // When the distance duration is below 1 / 75, we consider
    // the cursor position as being on the CUE point position
    // (as on an audio CD).
    return distanceDuration < ((1 / 75) + cursorWindow);
}

// #############################################################################
// ## State
// #############################################################################

// We can declare these vars on the `DenonSC3900` object directly no matter the
// given `group` received in listeners as a group is composed of one deck only
// and this script is not memory shared among decks.

DenonSC3900.clrButtonPressed = false;
DenonSC3900.syncButtonPressedAt = null;

// #############################################################################
// ## Startup management
// #############################################################################

// on deck startup
DenonSC3900.init = function () {
    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900s, and that we're only shutting down a deck on mixxx exit.
    //
    // @FIXME this blind behavior is dangerous ! We should only target this
    // unit instead.
    // @see https://github.com/mixxxdj/manual/issues/118
    //
    // When stating mixxx, set the beatjump size to our default value.

    for (var channel = 0; channel < DenonSC3900.getDecksCount(); channel++) {
        engine.setValue(
            DenonSC3900.inputChannelToGroupName(channel),
            "beatjump_size",
            DenonSC3900.BEATJUMP_SIZE_DEFAULT
        );
    }
}

// #############################################################################
// ## Shutdown management
// #############################################################################

/**
 * @param number outputChannel
 */
DenonSC3900.resetLightsToNormalMidiModeDefault = function (outputChannel) {
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.AUTO_LOOP_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.A_LOOP_LIGHT_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.B_LOOP_LIGHT_WRITE_ADDRESS);

    for (var i = 1; i <= DenonSC3900.getHotcuesCount(); i++) {
        midi.sendShortMsg(
            outputChannel,
            DenonSC3900.LIGHT_OFF,
            DenonSC3900.HOTCUES_WRITE_ADDRESSES[i]["light"]
        );
    }

    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SYNC_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.KEY_ADJUST_WRITE_ADDRESS);
    // vinyl mode LED is ON when connecting the SC3900 unit
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SELECT_WRITE_ADDRESS);

    // The remaining items lights are managed by the SC3900 unit directly in
    // hybrid MIDI mode.
}

// on deck shutdown
DenonSC3900.shutdown = function () {
    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900s, and that we're only shutting down a deck on mixxx exit.
    //
    // @FIXME this blind behavior is dangerous ! We should only target this
    // unit instead.
    // @see https://github.com/mixxxdj/manual/issues/118
    //
    // When leaving mixxx, we set back the SC3900 lights to their default
    // values (i.e. as how they are when we connect the deck for the first time
    // in normal MIDI mode).

    for (var channel = 0; channel < DenonSC3900.getDecksCount(); channel++) {
        DenonSC3900.resetLightsToNormalMidiModeDefault(
            DenonSC3900.getOutputMidiChannel(channel)
        );
    }
}

// #############################################################################
// ## Loop management
// #############################################################################

// only triggered in hybrid MIDI mode
DenonSC3900.onHybridMidiModeLoopSizeHalveOrDouble = function (channel, control, value, status, group) {
    if (value !== DenonSC3900.HYBRID_MIDI_LOOP_HALVE_VALUE && value !== DenonSC3900.HYBRID_MIDI_LOOP_DOUBLE_VALUE) {
        return;
    }

    var action = value === DenonSC3900.HYBRID_MIDI_LOOP_HALVE_VALUE
        ? 'loop_halve'
        : 'loop_double'
    ;

    engine.setValue(group, action, true);
}

// #############################################################################
// ## Hotcues management
// #############################################################################

/**
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.renderHotcuesLights = function (outputChannel, group) {
    for (var i = 1; i <= DenonSC3900.getHotcuesCount(); i++) {
        var destinationAddress = DenonSC3900.isHotcueSet(group, i)
            ? DenonSC3900.HOTCUES_WRITE_ADDRESSES[i]["light"]
            : DenonSC3900.HOTCUES_WRITE_ADDRESSES[i]["dimmer"]
        ;

        midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_ON, destinationAddress);
    }
}

// on MIDIBANK switch
DenonSC3900.onMidiBankSwitch = function (channel, control, value, status, group) {
    // There is no way to know if the MIDIBANK2 is enabled on the Denon unit,
    // so we render the 8 hotcues lights to cover the two cases
    // (MIDIBANK2 enabled/disabled).
    DenonSC3900.renderHotcuesLights(
        DenonSC3900.getOutputMidiChannel(channel),
        group
    )
}

// on CLR button press
DenonSC3900.onClrButtonPress = function () {
    DenonSC3900.clrButtonPressed = true;
}

// on CLR button release
DenonSC3900.onClrButtonRelease = function () {
    DenonSC3900.clrButtonPressed = false;
}

// on a hotcue press
DenonSC3900.onHotcuePress = function (group, hotcueNumber) {
    var action = DenonSC3900.clrButtonPressed
        ? "clear"
        : (DenonSC3900.isHotcueSet(group, hotcueNumber) && !DenonSC3900.isPlaying(group))
            ? "goto" // handles `goto` behavior while paused
            : "activate" // handles `goto` behavior while playing and `set` behaviors while playing/paused
    ;

    var valueName = "hotcue_" + hotcueNumber + "_" + action;

    engine.setValue(group, valueName, true);
}

DenonSC3900.createHotcuePressHandler = function (hotcueNumber) {
    return function (channel, control, value, status, group) {
        DenonSC3900.onHotcuePress(group, hotcueNumber)
    }
}

for (var i = 1; i <= DenonSC3900.getHotcuesCount(); i++) {
    var hotcuePressHandlerName = "onHotcue" + i + "Press"

    // create onHotcueXPress handlers
    DenonSC3900[hotcuePressHandlerName] = DenonSC3900.createHotcuePressHandler(i)
}

// #############################################################################
// ## Beatjump size management
// #############################################################################

// on track search - button press
DenonSC3900.onBeatJumpSizeDecrease = function (channel, control, value, status, group) {
    var currentSize = engine.getValue(group, "beatjump_size");

    var index = DenonSC3900.BEATJUMP_SIZES.indexOf(currentSize);

    var newSize;

    if (-1 === index) {
        // current value not found in possibilities,
        // so get back to default value
        newSize = DenonSC3900.BEATJUMP_SIZE_DEFAULT;
    } else if (0 === index) {
        // already at minimum size
        newSize = currentSize;
    } else {
        newSize = DenonSC3900.BEATJUMP_SIZES[index - 1];
    }

    engine.setValue(group, "beatjump_size", newSize);
}

// on track search + button press
DenonSC3900.onBeatJumpSizeIncrease = function (channel, control, value, status, group) {
    var currentSize = engine.getValue(group, "beatjump_size");

    var index = DenonSC3900.BEATJUMP_SIZES.indexOf(currentSize);

    var newSize;

    if (-1 === index) {
        // current value not found in possibilities,
        // so get back to default value
        newSize = DenonSC3900.BEATJUMP_SIZE_DEFAULT;
    } else if (DenonSC3900.BEATJUMP_SIZES.length - 1 === index) {
        // already at maximum size
        newSize = currentSize;
    } else {
        newSize = DenonSC3900.BEATJUMP_SIZES[index + 1];
    }

    engine.setValue(group, "beatjump_size", newSize);
}

// #############################################################################
// ## SYNC management
// #############################################################################

// on SYNC button press
DenonSC3900.onSyncButtonPress = function (channel, control, value, status, group) {
    // A long press on the SYNC button (press and hold) should set the deck
    // as the sync master.
    // A short press on the SYNC button should toggle the sync feature for this
    // deck.

    DenonSC3900.syncButtonPressedAt = DenonSC3900.getTimestampMs();

    engine.beginTimer(
        DenonSC3900.LONG_PRESS_THRESHOLD_MS,
        function () {
            if (null !== DenonSC3900.syncButtonPressedAt) {
                // the SYNC button is still pressed after the elapsed threshold,
                // set this deck as the sync master.
                engine.setValue(group, "sync_master", true);
            }
        },
        true
    );
}

// on SYNC button release
DenonSC3900.onSyncButtonRelease = function (channel, control, value, status, group) {
    var releaseTimestamp = DenonSC3900.getTimestampMs();
    var pressTimestamp = DenonSC3900.syncButtonPressedAt;
    DenonSC3900.syncButtonPressedAt = null;

    var heldDownDuration = releaseTimestamp - pressTimestamp;

    if (heldDownDuration < DenonSC3900.LONG_PRESS_THRESHOLD_MS) {
        // short press on SYNC button, toggle the sync mode for this deck
        var currentSyncState = engine.getValue(group, "sync_enabled");

        engine.setValue(group, "sync_enabled", !currentSyncState);
    }
}

// #############################################################################
// ## CUE management
// #############################################################################

// on CUE button press
DenonSC3900.onCueButtonPress = function (channel, control, value, status, group) {
    if (DenonSC3900.isPlaying(group)) {
        // Nothing to do here. The SC3900 unit will stop the DVS playback, and
        // the onCueButtonRelease handler will move the cursor to the cuepoint.
        return;
    }

    // As Mixxx updates the "play" indicator after one second of DVS playback,
    // we look if the cursor is on the cue point with a window of +/- 1.0 second.
    // If we don't use that window, hitting the CUE button less than one second
    // after hitting the play button would make Mixxx think that the deck
    // isn't playing, and so would set a cuepoint on the cursor instead of going
    // to the last cuepoint.
    // The drawback of this workaround is that you can't move the cuepoint from
    // a distance of < 1.0 seconds.
    //
    // A better way to know whether the deck is playing or not would be to scan
    // for DVS input signal volume, but I don't think there's a way for it yet.
    var cursorWindow = 1.0;
    if (!DenonSC3900.isCursorOnCuePoint(group, cursorWindow)) {
        engine.setValue(group, "cue_set", true);
    }
}

// on CUE button release
DenonSC3900.onCueButtonRelease = function (channel, control, value, status, group) {
    // go to the CUE point when the DVS signal has fully stopped
    var playPollingTimer = engine.beginTimer(
        20, // minimum allowed time value, in ms
        function () {
            if (DenonSC3900.isPlaying(group)) {
                return;
            }

            engine.setValue(group, "cue_goto", true);
            engine.stopTimer(playPollingTimer);
        }
    );
}
