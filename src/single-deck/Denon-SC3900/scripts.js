// @see https://www.mixxx.org/wiki/doku.php/midi_scripting

// Script written using a DenonSC3900 deck with firmware version 1168.
// @see https://denondjforum.com/t/attention-sc3900-software-sys-1168-nov-2014/112
function DenonSC3900 () {}

// @see Denon SC3900 manual for hex values, on page 34.
DenonSC3900.LIGHT_ON = 0x4A
DenonSC3900.LIGHT_OFF = 0x4B

DenonSC3900.AUTO_LOOP_WRITE_ADDRESS = 0x2B
DenonSC3900.A_LOOP_LIGHT_WRITE_ADDRESS = 0X24
DenonSC3900.B_LOOP_LIGHT_WRITE_ADDRESS = 0X40

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

DenonSC3900.REVERSE_WRITE_ADDRESS = 0x3A
DenonSC3900.CUE_WRITE_ADDRESS = 0x26
DenonSC3900.PLAY_WRITE_ADDRESS = 0x27
DenonSC3900.SYNC_WRITE_ADDRESS = 0x52
DenonSC3900.KEY_ADJUST_WRITE_ADDRESS = 0x08
DenonSC3900.VINYL_WRITE_ADDRESS = 0x06
DenonSC3900.DUMP_WRITE_ADDRESS = 0x29
DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS = 0x59
DenonSC3900.SELECT_WRITE_ADDRESS = 0x1E

// Set it to `normal` or `hybrid` in function of your usage.
DenonSC3900.MIDI_MODE = "hybrid";

// You may change this value to increase the sensibility of the jog wheel when
// used for pitch bending.
// > 1 : more sensible
// < 1 : less sensible
// Should be a positive number.
DenonSC3900.JOG_WHEEL_PITCH_BEND_SENSIBILITY = 1.0;

// The platter control is not described in the Denon manual.
// This address has been grabbed from :
// https://github.com/matthias-johnson/SC3900/blob/d63aaf89f08d1e2d5ffe9042e22adf28a0a27f36/SC3900-scripts.js#L54
// This address only accepts two values : 0 and 127 (i.e. stop and rotate).
DenonSC3900.PLATTER_WRITE_ADDRESS = 0x66
DenonSC3900.PLATTER_ROTATE = 0x7F
DenonSC3900.PLATTER_STOP = 0x00
DenonSC3900.PLATTER_INCREASE_SPEED_BY_PERCENT_WRITE_ADDRESS = 0x68
DenonSC3900.PLATTER_DECREASE_SPEED_BY_PERCENT_WRITE_ADDRESS = 0x69
// You may change this value to 45 if your SC3900 unit is set to have 45 RPM.
DenonSC3900.PLATTER_RPM = 33 + 1/3;
DenonSC3900.PLATTER_STATE_TRANSITION_DURATION_MS = 400; // no matter RPM rate

// The duration of a revolution, at normal speed (pitch 0) in µs.
// We use the µs unit as the S3900 deck is sending us data in this unit.
DenonSC3900.PLATTER_REVOLUTION_WIDTH =
    // duration of a revolution, in seconds
    (60 / DenonSC3900.PLATTER_RPM)
    // convert it to µs
    * 1000000
;
// The duration between two pulses at normal speed, in µs.
// We use the µs unit as the S3900 deck is sending us data in this unit.
// The scale used here is 900 pulses per revolution, as specified in the
// Denon manual. The jog wheel pulse width sent by the SC3900 uses this scale.
DenonSC3900.PLATTER_PULSE_WIDTH = DenonSC3900.PLATTER_REVOLUTION_WIDTH / 900;

// The minimum time interval that is considered by the SC3900 unit to count
// the amount of these intervals elapsed before walking a pulse when using the
// high res pulses per revolution scale.
// This interval is in ms. As specified in the Denon manual (> 4 ms).
DenonSC3900.HIGH_RES_MINIMUM_TIME_INTERVAL_BEFORE_WALKING_A_PULSE_MS = 5;
// The number of pulses per miliseconds the platter is doing when moving
// at normal speed (pitch 0) on the high res pulses per revolution scale.
// This scale is 3600, as specified in the Denon manual.
DenonSC3900.HIGH_RES_PLATTER_PULSES_PER_MS =
    3600 / (
        // duration of a revolution, in seconds
        (60 / DenonSC3900.PLATTER_RPM)
        // convert it to ms
        * 1000
    )
;

DenonSC3900.LONG_PRESS_THRESHOLD_MS = 500;

// @see https://www.mixxx.org/wiki/doku.php/mixxxcontrols
DenonSC3900.BEATJUMP_SIZES = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
DenonSC3900.BEATJUMP_SIZE_DEFAULT = 4; // same as when mixxx starts

// #############################################################################
// ## Utilities
// #############################################################################

/**
 * @return bool
 */
DenonSC3900.isNormalMidiMode = function () {
    return "normal" === DenonSC3900.MIDI_MODE;
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
 * @param number inputChannel (0 based)
 *
 * @return string
 */
DenonSC3900.getGroupName = function (inputChannel) {
    var channelNumber = inputChannel + 1;

    return "[Channel" + channelNumber + "]";
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
    if (DenonSC3900.isNormalMidiMode()) {
        return DenonSC3900.playing;
    }

    return engine.getValue(group, "play");
}

/**
 * @param string group
 *
 * @return bool
 */
DenonSC3900.isCursorOnCuePoint = function (group) {
    // the CUE point position, in samples
    var cuePointPosition = engine.getValue(group, "cue_point");

    // the position of the cursor in the track [0-1]
    var cursorPositionRate = engine.getValue(group, "playposition");
    // the amount of samples in the track
    var trackSamplesCount = engine.getValue(group, "track_samples");

    // the cursor position, in samples
    var cursorPosition = cursorPositionRate * trackSamplesCount;

    // Compare the difference rate instead of the position samples directly,
    // as there can have a few samples diff (e.g. < 10) when the cursor is
    // placed on the CUE point.
    var lowestPosition = Math.min(cuePointPosition, cursorPosition);
    var highestPosition = Math.max(cuePointPosition, cursorPosition);
    var rate = lowestPosition / highestPosition;

    // When the diff rate is below 1 per-mille, we consider the cursor position
    // as being on the CUE point position.
    return (1 - rate) < 0.001;
}

// #############################################################################
// ## State
// #############################################################################

// We can declare these vars on the `DenonSC3900` object directly no matter the
// given `group` received in listeners as a group is composed of one deck only
// and this script is not memory shared among decks.

DenonSC3900.clrButtonPressed = false;
DenonSC3900.syncButtonPressedAt = null;
DenonSC3900.pitchFaderMsb = 0;
// The jog bend value is centered on 64 (0x40)
DenonSC3900.jogWheelBend = 64;
DenonSC3900.jogWheelPulseWidthMsb = 0;
DenonSC3900.jogWheelPulseWidthLsb = 0;
DenonSC3900.jogWheelTimeIntervalCountElapsedBeforeWalkingAPulse = 0;
// Activated by default when connecting the SC3900 unit in normal MIDI mode.
// For hybrid MIDI mode, the vinyl mode is managed by the SC3900 unit itself,
// so this var is always false.
DenonSC3900.vinylModeActivated = DenonSC3900.isNormalMidiMode();
DenonSC3900.applyVinylDiscRotationSpeed = true;
DenonSC3900.stoppedVinylDiscDetectionTimerId = null;
// No playback by default when connecting the SC3900 unit in normal MIDI mode.
// This value should only be considered for normal MIDI mode as the SC3900 unit
// manages its own playing state in hybrid MIDI mode.
// Always use the `isPlaying` function to know the playing state instead of this
// var directly.
DenonSC3900.playing = !DenonSC3900.isNormalMidiMode();
// Only considered in normal MIDI mode.
DenonSC3900.pitchFaderRate = 0.0;

// #############################################################################
// ## Init management
// #############################################################################

// on deck init
DenonSC3900.init = function () {
    if (!DenonSC3900.isNormalMidiMode()) {
        // The items managed by this `init` functions are managed by the
        // SC3900 unit directly when in hybrid MIDI mode.
        return;
    }

    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900.
    //
    // @FIXME this blind behavior is dangerous ! We should only target this
    // unit instead.
    // @see https://github.com/mixxxdj/manual/issues/118
    //
    // When connecting a deck to mixxx, make sure that the LED controlled via
    // listeners in this script as reflecting this script state.

    for (var channel = 0; channel < DenonSC3900.getDecksCount(); channel++) {
        var outputChannel = DenonSC3900.getOutputMidiChannel(channel);
        var group = DenonSC3900.getGroupName(channel);

        midi.sendShortMsg(
            outputChannel,
            DenonSC3900.LIGHT_ON,
            DenonSC3900.VINYL_WRITE_ADDRESS
        );

        DenonSC3900.updatePlatterStatus(outputChannel, group);
        DenonSC3900.updateScratchingStatus(group);
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

    if (!DenonSC3900.isNormalMidiMode()) {
        // The remaining items are managed by the SC3900 unit directly when in
        // hybrid MIDI mode.
        return;
    }

    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.CUE_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.PLAY_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.REVERSE_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_ON, DenonSC3900.VINYL_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.DUMP_WRITE_ADDRESS);
    DenonSC3900.stopPlatter(outputChannel);
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
            ? "goto"
            : "activate"
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
// ## Pitch fader management
// #############################################################################

// on pitch fader MSB change
// Not triggered in hybrid MIDI mode.
DenonSC3900.onPitchFaderMsb = function (channel, control, value) {
    DenonSC3900.pitchFaderMsb = value;
}

// on pitch fader LSB change
// Not triggered in hybrid MIDI mode.
DenonSC3900.onPitchFaderLsb = function (channel, control, value, status, group) {
    var msbValue = DenonSC3900.pitchFaderMsb;

    // The `fullValue` number is determined by two number contained on a 7bits
    // sequence. As a 7 bit sequence can contain 128 values (0-127), the
    // `fullValue` number can contain 128*128 values : 0-16383.
    var fullValue = (msbValue << 7) + value;

    // When fullValue == 0 (min), the pitch fader is at the top position.
    // When fullValue == 8192 (middle), the pitch fader is at the center position.
    // When fullValue == 16383 (max), the pitch fader is at the bottom position.

    // rate [-1; 1]
    var rate = (fullValue - 8192) / 8192;

    // Only matters in normal MIDI mode.
    DenonSC3900.pitchFaderRate = rate;

    // Somehow mixxx is inverting the rate (i.e. the positive pitch area is
    // understood as the negative area and vice versa), so we fix it here by
    // multiplying the rate by -1.
    engine.setValue(group, "rate", rate * -1);

    if (DenonSC3900.vinylModeActivated) {
        DenonSC3900.updatePlatterSpeed(
            DenonSC3900.getOutputMidiChannel(channel),
            group
        );
    }
}

// #############################################################################
// ## Vinyl disc management
// #############################################################################

/**
 * @param string group
 */
DenonSC3900.enableScratching = function (group) {
    engine.setValue(group, "scratch2_enable", true);
}

/**
 * @param string group
 */
DenonSC3900.disableScratching = function (group) {
    engine.setValue(group, "scratch2_enable", false);
}

/**
 * Whether to enable or disable mixxx scratching engine, in function of
 * the deck state.
 *
 * @param string group
 */
DenonSC3900.updateScratchingStatus = function (group) {
    DenonSC3900.vinylModeActivated
        ? DenonSC3900.enableScratching(group)
        : DenonSC3900.disableScratching(group)
    ;
}

/**
 * @param string group
 * @param float rate
 */
DenonSC3900.setScratchingRate = function (group, rate) {
    if (!DenonSC3900.applyVinylDiscRotationSpeed) {
        // Ignore the wheel signal. The platter is probably changing its
        // state while playback is on, so we should not consider the slowing
        // or accelerating bends while the platter state changes, in order to
        // avoid track pitch bends.
        return;
    }

    engine.setValue(group, "scratch2", rate);
}

// on jog wheel bend change
// Not triggered in hybrid MIDI mode.
DenonSC3900.onJogWheelBend = function (channel, control, value) {
    DenonSC3900.jogWheelBend = value;
}

// when the time interval count elapsed before walking a pulse changes
// Not triggered in hybrid MIDI mode.
DenonSC3900.onJogWheelTimeIntervalCountElapsedBeforeWalkingAPulse = function (channel, control, value) {
    DenonSC3900.jogWheelTimeIntervalCountElapsedBeforeWalkingAPulse = value
}

// on jog wheel pulse width MSB change
// Not triggered in hybrid MIDI mode.
DenonSC3900.onJogWheelPulseWidthMsb = function (channel, control, value) {
    DenonSC3900.jogWheelPulseWidthMsb = value;
}

// on jog wheel pulse width LSB change
// Not triggered in hybrid MIDI mode.
DenonSC3900.onJogWheelPulseWidthLsb = function (channel, control, value, status, group) {
    DenonSC3900.jogWheelPulseWidthLsb = value;

    DenonSC3900.vinylModeActivated
        ? DenonSC3900.jogWheelScratch(group)
        : DenonSC3900.jogWheelPitchBend(group)
    ;
}

/**
 * @param string group
 */
DenonSC3900.jogWheelScratch = function (group) {
    // The jog bend value is centered on 64 (0x40)
    var direction = DenonSC3900.jogWheelBend < 64
        ? -1
        : 1
    ;

    // 1 : same speed as the platter.
    // < 1 : slower than the platter.
    // > 1 : faster than the platter.
    // 0 : stopped.
    var vinylDiscSpeedRatio = 0.0; // init var

    if (DenonSC3900.jogWheelTimeIntervalCountElapsedBeforeWalkingAPulse > 0) {
        // When the time interval count elapsed before walking a pulse is
        // greater than zero, it means that the vinyl disc is rotated at very
        // low speed (typically when holding down the fingers on it and making
        // tiny moves).
        // In this use case, the pulse count per revolution is not the same than
        // at normal speed. This count increase is here to increase the
        // precision measurement of the vinyl disc rotation speed at very low
        // speed.

        // in miliseconds
        var walkDurationMs =
            DenonSC3900.jogWheelTimeIntervalCountElapsedBeforeWalkingAPulse
            * DenonSC3900.HIGH_RES_MINIMUM_TIME_INTERVAL_BEFORE_WALKING_A_PULSE_MS
        ;

        // we have walked one pulse in `walkDurationMs` miliseconds
        var vinylDiscPulsesPerMs = 1 / walkDurationMs;

        vinylDiscSpeedRatio =
            vinylDiscPulsesPerMs / DenonSC3900.HIGH_RES_PLATTER_PULSES_PER_MS
        ;
    } else {
        // When not on a tiny movement, the disc speed info is transmitted
        // on 14bits data.
        var pulseWidthMsb = DenonSC3900.jogWheelPulseWidthMsb;
        var pulseWidthLsb = DenonSC3900.jogWheelPulseWidthLsb;

        var transmittedValue = ((pulseWidthMsb << 7) + pulseWidthLsb);

        // The transmitted value is computed from the time it takes to
        // walk two complete pulses, so we divide it by two to get the pulse
        // width of a single pulse.
        var pulseWidth = transmittedValue / 2;

        vinylDiscSpeedRatio = 0 == pulseWidth // prevent divide by 0
            ? 0.0
            : DenonSC3900.PLATTER_PULSE_WIDTH / pulseWidth
        ;
    }

    // As the DenonSC3900 unit does not send any data when the disc is stopped
    // (because it only sends data on disc move), we programmatically stop
    // the disc (i.e. set its speed to 0) when the latest measured speed is low
    // (i.e. < 0.1), and when we do not receive other disc rotation infos while
    // a small amount of time.
    // We use a timer instead of hard setting the 0 value here directly,
    // in order to keep the smooth start and stop effect when the platter
    // starts or stops.
    vinylDiscSpeedRatio < 0.1
        ? DenonSC3900.setStoppedVinylDiscDetectionTimer(group)
        : DenonSC3900.removeStoppedVinylDiscDetectionTimer()
    ;

    DenonSC3900.setScratchingRate(group, vinylDiscSpeedRatio * direction);
}

/**
 * @param string group
 */
DenonSC3900.jogWheelPitchBend = function (group) {
    if (!DenonSC3900.applyVinylDiscRotationSpeed) {
        return;
    }

    // The jog bend value is centered on 64 (0x40)
    var relativeValue = DenonSC3900.jogWheelBend - 64;

    // divide by 20 to reduce mixxx sensibility
    var finalValue = relativeValue / 20;

    engine.setValue(
        group,
        "jog",
        finalValue * DenonSC3900.JOG_WHEEL_PITCH_BEND_SENSIBILITY
    );
}

/**
 * Set the stopped vinyl disc detection timer if not already set.
 *
 * @param string group
 */
DenonSC3900.setStoppedVinylDiscDetectionTimer = function (group) {
    if (null !== DenonSC3900.stoppedVinylDiscDetectionTimerId) {
        return;
    }

    DenonSC3900.stoppedVinylDiscDetectionTimerId = engine.beginTimer(
        DenonSC3900.PLATTER_STATE_TRANSITION_DURATION_MS / 2,
        function () {
            DenonSC3900.setScratchingRate(group, 0.0);
        },
        true
    );
}

/**
 * Removes the stopped vinyl disc detection timer if not already stopped.
 */
DenonSC3900.removeStoppedVinylDiscDetectionTimer = function () {
    if (null === DenonSC3900.stoppedVinylDiscDetectionTimerId) {
        return;
    }

    engine.stopTimer(DenonSC3900.stoppedVinylDiscDetectionTimerId);

    DenonSC3900.stoppedVinylDiscDetectionTimerId = null;
}

// #############################################################################
// ## CUE management
// #############################################################################

// on CUE button press
DenonSC3900.onCueButtonPress = function (channel, control, value, status, group) {
    if (DenonSC3900.isPlaying(group)) {
        if (DenonSC3900.vinylModeActivated) {
            // Tell mixxx to immediatly stop the disc rotation speed, and
            // ignore the received disc speed messages from the SC3900 while
            // the platter stops.
            DenonSC3900.setScratchingRate(group, 0.0);

            DenonSC3900.dontApplyVinylDiscRotationSpeedWhilePlatterStateIsChanging(group);

            DenonSC3900.stopPlatter(
                DenonSC3900.getOutputMidiChannel(channel)
            );
        }

        engine.setValue(group, "cue_gotoandstop", value);

        // Only matters in normal MIDI mode.
        DenonSC3900.playing = false;

        return;
    }

    if (DenonSC3900.isCursorOnCuePoint(group)) {
        if (DenonSC3900.vinylModeActivated) {
            // Disable scratching in order to let mixxx playback the track while
            // we hold down the CUE button and the platter is stopped.
            DenonSC3900.disableScratching(group);
        }

        engine.setValue(group, "cue_preview", true);
    } else {
        engine.setValue(group, "cue_set", true);
    }
}

// on CUE button release
DenonSC3900.onCueButtonRelease = function (channel, control, value, status, group) {
    // The `cue_preview` mode is setting the `play` flag to true, so we make
    // sure it is disabled when releasing the CUE button.
    engine.setValue(group, "play", false);
    engine.setValue(group, "cue_gotoandstop", true);

    if (DenonSC3900.vinylModeActivated) {
        // Enable back scratching in order to be able to move the vinyl disc to
        // navigate through the track around the CUE point.
        DenonSC3900.enableScratching(group);
    }
}

// #############################################################################
// ## Play management
// #############################################################################

// on Play/Pause button press
// Not triggered in hybrid MIDI mode.
DenonSC3900.onPlayPauseButtonPress = function (channel, control, value, status, group) {
    DenonSC3900.playing = !DenonSC3900.playing;

    engine.setValue(group, "play", DenonSC3900.playing);

    DenonSC3900.updatePlatterStatus(
        DenonSC3900.getOutputMidiChannel(channel),
        group
    );
}

// #############################################################################
// ## Vinyl mode management
// #############################################################################

/**
 * Avoid to apply the vinyl disc rotation rate while the platter is changing its
 * state. It prevents to produce pitch bends on the track due to the vinyl disc
 * speed change when the platter speed changes.
 *
 * @param string group
 */
DenonSC3900.dontApplyVinylDiscRotationSpeedWhilePlatterStateIsChanging = function (group) {
    DenonSC3900.applyVinylDiscRotationSpeed = false;

    // We disable the scratching engine as we stop to consider the jog wheel
    // signals, so the track speed is not controlled by the jog wheel anymore.
    DenonSC3900.disableScratching(group);

    engine.beginTimer(
        DenonSC3900.PLATTER_STATE_TRANSITION_DURATION_MS,
        function () {
            DenonSC3900.applyVinylDiscRotationSpeed = true;

            // Decide whether the scratching engine should be enabled back
            // or not.
            DenonSC3900.updateScratchingStatus(group);
        },
        true
    );
}

// on VINYL button press
// Not triggered in hybrid MIDI mode.
DenonSC3900.onVinylButtonPress = function (channel, control, value, status, group) {
    DenonSC3900.vinylModeActivated = !DenonSC3900.vinylModeActivated;

    var outputChannel = DenonSC3900.getOutputMidiChannel(channel);

    var lightStatus = DenonSC3900.vinylModeActivated
        ? DenonSC3900.LIGHT_ON
        : DenonSC3900.LIGHT_OFF
    ;

    midi.sendShortMsg(outputChannel, lightStatus, DenonSC3900.VINYL_WRITE_ADDRESS);

    if (DenonSC3900.playing) {
        // When the playback is on, avoid to consider the jog wheel messages
        // while the platter is changing its state.
        DenonSC3900.dontApplyVinylDiscRotationSpeedWhilePlatterStateIsChanging(group);
    } else {
        if (DenonSC3900.vinylModeActivated) {
            // Make sure the scratch engine won't start to play the track.
            DenonSC3900.setScratchingRate(group, 0.0);
            DenonSC3900.enableScratching(group);
        } else {
            DenonSC3900.disableScratching(group);
        }
    }

    DenonSC3900.updatePlatterStatus(outputChannel, group);
}

// #############################################################################
// ## Platter management
// #############################################################################

/**
 * @param number outputChannel
 */
DenonSC3900.stopPlatter = function (outputChannel) {
    midi.sendShortMsg(
        outputChannel,
        DenonSC3900.PLATTER_WRITE_ADDRESS,
        DenonSC3900.PLATTER_STOP
    );
}

/**
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.rotatePlatter = function (outputChannel, group) {
    midi.sendShortMsg(
        outputChannel,
        DenonSC3900.PLATTER_WRITE_ADDRESS,
        DenonSC3900.PLATTER_ROTATE
    );

    DenonSC3900.updatePlatterSpeed(outputChannel, group);
}

/**
 * Whether to rotate or stop the SC3900 platter, in function of the deck state.
 *
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.updatePlatterStatus = function (outputChannel, group) {
    if (!DenonSC3900.vinylModeActivated) {
        DenonSC3900.stopPlatter(outputChannel);

        return
    }

    DenonSC3900.playing
        ? DenonSC3900.rotatePlatter(outputChannel, group)
        : DenonSC3900.stopPlatter(outputChannel)
    ;
}

/**
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.updatePlatterSpeed = function (outputChannel, group) {
    var rate = DenonSC3900.pitchFaderRate;

    // Address to send the speed diff on the 0.01% scale.
    // Unfortunately, this address doesn't seem to exist on the SC3900 :( .
    // @see https://github.com/nm2107/mixxx-midi-mappings/pull/1
    // var restAddress = rate > 0
    //     ? TBD
    //     : TBD
    // ;

    var pitchRange = engine.getValue(group, "rateRange");

    // percentage
    var absolutePitchDiff = Math.abs(rate * 100) * pitchRange;

    var diffInteger = Math.floor(absolutePitchDiff);
    // var diffRest = absolutePitchDiff - diffInteger;

    // var restAsInteger = diffInteger * 100;

    // Addresses to send the speed diff on the 1% scale.
    // When the diffInteger equals `0`, we should send the message on both
    // increase and decrease speed addresses to make a complete reset.
    var integerAddresses = 0 === diffInteger
        ? [
            DenonSC3900.PLATTER_DECREASE_SPEED_BY_PERCENT_WRITE_ADDRESS,
            DenonSC3900.PLATTER_INCREASE_SPEED_BY_PERCENT_WRITE_ADDRESS
        ]
        : rate > 0
            ? [DenonSC3900.PLATTER_INCREASE_SPEED_BY_PERCENT_WRITE_ADDRESS]
            : [DenonSC3900.PLATTER_DECREASE_SPEED_BY_PERCENT_WRITE_ADDRESS]
    ;

    for (var i = 0; i < integerAddresses.length; i++) {
        midi.sendShortMsg(
            outputChannel,
            integerAddresses[i],
            diffInteger
        );
    }

    // midi.sendShortMsg(
    //     outputChannel,
    //     restAddress,
    //     restAsInteger
    // );
}
