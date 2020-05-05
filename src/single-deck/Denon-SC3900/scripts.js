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
// I'm not aware of any addresses and values to set the platter rotation speed
// (i.e. to influence on start and stop durations).
DenonSC3900.PLATTER_WRITE_ADDRESS = 0x66
DenonSC3900.PLATTER_ROTATE = 0x7F
DenonSC3900.PLATTER_STOP = 0x00
// You may change this value to 45 if your SC3900 unit is set to have 45 RPM.
DenonSC3900.PLATTER_RPM = 33 + 1/3;
DenonSC3900.PLATTER_STATE_TRANSITION_DURATION_MS = 400; // no matter RPM rate
// When moving at normal speed (pitch 0), this is the amount of pulses that the
// SC3900 is internally effecting. As described in the Denon manual.
DenonSC3900.PLATTER_PULSES_COUNT_PER_REVOLUTION = 900;
// When moving at tiny speed, this is the amount of pulses that the SC3900 is
// internally effecting. As described in the Denon manual.
DenonSC3900.PLATTER_TINY_MOVEMENT_PULSES_COUNT_PER_REVOLUTION = 3600;

// The duration of a revolution, at normal speed (pitch 0) in µs.
// We use the µs unit as the S3900 deck is sending us data in this unit.
DenonSC3900.PLATTER_REVOLUTION_WIDTH =
    // duration of a revolution, in seconds
    (60 / DenonSC3900.PLATTER_RPM)
    // convert it to µs
    * 1000000
;
// The duration between two pulses, at normal speed (pitch 0), in µs.
// We use the µs unit as the S3900 deck is sending us data in this unit.
DenonSC3900.PLATTER_PULSE_WIDTH = DenonSC3900.PLATTER_REVOLUTION_WIDTH
    / DenonSC3900.PLATTER_PULSES_COUNT_PER_REVOLUTION
;

DenonSC3900.LONG_PRESS_THRESHOLD_MS = 500;

// #############################################################################
// ## Utilities
// #############################################################################

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
 * @param int hotcueNumber
 *
 * @return bool
 */
DenonSC3900.isHotcueSetAndPlaybackDisabled = function (group, hotcueNumber) {
    return DenonSC3900.isHotcueSet(group, hotcueNumber)
        && !DenonSC3900.isPlaying(group)
    ;
}

/**
 * @param string group
 *
 * @return bool
 */
DenonSC3900.isPlaying = function (group) {
    return (
            engine.getValue(group, "play_indicator")
            || engine.getValue(group, "play")
        )
        && !engine.getValue(group, "cue_default")
    ;
}

// #############################################################################
// ## Registries
// #############################################################################

/**
 * Constructor for a registry which would indicate whether the CLR button is
 * being held down or not.
 */
DenonSC3900.createClrButtonRegistry = function () {
    var registry = {};

    var isPresentInRegistry = function (group) {
        return undefined !== registry[group]
    }

    return {
        buttonPressed: function (group) {
            registry[group] = true;
        },
        buttonReleased: function (group) {
            if (isPresentInRegistry(group)) {
                delete registry[group];
            }
        },
        isPressed: function (group) {
            return isPresentInRegistry(group);
        }
    };
}

DenonSC3900.clrButtonRegistry = DenonSC3900.createClrButtonRegistry()

/**
 * Constructor for a registry which would indicate when the SYNC button has
 * been pressed down.
 */
DenonSC3900.createSyncButtonRegistry = function () {
    var registry = {}

    var isPresentInRegistry = function (group) {
        return undefined !== registry[group]
    }

    return {
        recordPressTimestamp: function (group) {
            registry[group] = DenonSC3900.getTimestampMs();
        },
        popPressTimestamp: function (group) {
            if (!isPresentInRegistry(group)) {
                return 0;
            }

            var pressTimestamp = registry[group];

            delete registry[group];

            return pressTimestamp;
        },
        isPressed: function (group) {
            return isPresentInRegistry(group);
        }
    };
}

DenonSC3900.syncButtonRegistry = DenonSC3900.createSyncButtonRegistry()

/**
 * Constructor for a registry which would hold the MSB value of the pitch fader.
 */
DenonSC3900.createPitchFaderMsbRegistry = function () {
    var registry = {}

    return {
        setPitchFaderMsb: function (group, value) {
            registry[group] = value;
        },
        getPitchFaderMsb: function (group) {
            return registry[group];
        }
    }
}

DenonSC3900.pitchFaderMsbRegistry = DenonSC3900.createPitchFaderMsbRegistry()

/**
 * Constructor for a registry which would hold the jog wheel bend
 * (used for jog wheel pitch bend and to know scratch direction).
 */
DenonSC3900.createJogWheelBendRegistry = function () {
    var registry = {}

    return {
        setJogWheelBend: function (group, value) {
            registry[group] = value;
        },
        getJogWheelBend: function (group) {
            return registry[group];
        }
    }
}

DenonSC3900.jogWheelBendRegistry = DenonSC3900.createJogWheelBendRegistry()

/**
 * Constructor for a registry which would hold the jog wheel pulse width MSB
 * (used for scratch ticks computing).
 */
DenonSC3900.createJogWheelPulseWidthMsbRegistry = function () {
    var registry = {}

    return {
        setJogWheelPulseWidthMsb: function (group, value) {
            registry[group] = value;
        },
        getJogWheelPulseWidthMsb: function (group) {
            return registry[group];
        }
    }
}

DenonSC3900.jogWheelPulseWidthMsbRegistry = DenonSC3900.createJogWheelPulseWidthMsbRegistry()

/**
 * Constructor for a registry which would hold the walked pulses when the
 * jog wheel is moved by tiny movements.
 */
DenonSC3900.createJogWheelTinyMovementWalkedPulsesRegistry = function () {
    var registry = {}

    return {
        setJogWheelTinyMovementWalkedPulses: function (group, value) {
            registry[group] = value;
        },
        getJogWheelTinyMovementWalkedPulses: function (group) {
            return registry[group];
        }
    }
}

DenonSC3900.jogWheelTinyMovementWalkedPulsesRegistry = DenonSC3900.createJogWheelTinyMovementWalkedPulsesRegistry()

/**
 * Constructor for a registry which would indicate whether the vinyl mode is
 * activated or not.
 */
DenonSC3900.createVinylModeRegistry = function () {
    var registry = {}

    return {
        toggleVinylMode: function (group) {
            // As the VINYL led is ON when connecting the SC3900 unit in MIDI,
            // `undefined` should be considered as a positive value.
            var currentValue = undefined === registry[group] || true === registry[group]

            registry[group] = !currentValue;
        },
        isVinylModeActivated: function (group) {
            // Should be activated by default as the VINYL led is ON when
            // connecting the SC3900 unit.
            return undefined === registry[group] || true === registry[group];
        }
    }
}

DenonSC3900.vinylModeRegistry = DenonSC3900.createVinylModeRegistry();

/**
 * Constructor for a registry which would indicate whether we should drop or
 * accept the MIDI signals sent by the jog wheel.
 */
DenonSC3900.createDropJogWheelMidiSignalsRegistry = function () {
    var registry = {}

    return {
        drop: function (group) {
            registry[group] = true;
        },
        accept: function (group) {
            registry[group] = false;
        },
        shouldDrop: function (group) {
            return true === registry[group];
        }
    }
}

DenonSC3900.dropJogWheelMidiSignalsRegistry = DenonSC3900.createDropJogWheelMidiSignalsRegistry();

// #############################################################################
// ## Shutdown management
// #############################################################################

// on deck init
DenonSC3900.init = function () {
    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900.
    //
    // @FIXME this blind behavior is dangerous !
    //
    // When connecting a deck to mixxx, make sure that the LED controlled via
    // listeners in this script as reflecting this script state.

    for (var channel = 0; channel < DenonSC3900.getDecksCount(); channel++) {
        var outputChannel = DenonSC3900.getOutputMidiChannel(channel);

        midi.sendShortMsg(
            outputChannel,
            DenonSC3900.LIGHT_ON,
            DenonSC3900.VINYL_WRITE_ADDRESS
        );

        DenonSC3900.stopPlatter(outputChannel);
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

    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.REVERSE_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.CUE_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.PLAY_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SYNC_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.KEY_ADJUST_WRITE_ADDRESS);
    // vinyl mode LED is ON when connecting the SC3900 unit
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_ON, DenonSC3900.VINYL_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.DUMP_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SELECT_WRITE_ADDRESS);

    DenonSC3900.stopPlatter(outputChannel);
}

// on deck shutdown
DenonSC3900.shutdown = function () {
    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900s, and that we're only shutting down a deck on mixxx exit.
    //
    // @FIXME this blind behavior is dangerous !
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
DenonSC3900.midiBankSwitch = function (channel, control, value, status, group) {
    // There is no way to know if the MIDIBANK2 is enabled on the Denon unit,
    // so we render the 8 hotcues lights to cover the two cases
    // (MIDIBANK2 enabled/disabled).
    DenonSC3900.renderHotcuesLights(
        DenonSC3900.getOutputMidiChannel(channel),
        group
    )
}

// on CLR button press
DenonSC3900.clrButtonPress = function (channel, control, value, status, group) {
    DenonSC3900.clrButtonRegistry.buttonPressed(group)
}

// on CLR button release
DenonSC3900.clrButtonRelease = function (channel, control, value, status, group) {
    DenonSC3900.clrButtonRegistry.buttonReleased(group)
}

// on a hotcue press
DenonSC3900.hotcuePress = function (group, hotcueNumber) {
    var action = DenonSC3900.clrButtonRegistry.isPressed(group)
        ? "clear"
        : DenonSC3900.isHotcueSetAndPlaybackDisabled(group, hotcueNumber)
            ? "goto"
            : "activate"
    ;

    var valueName = "hotcue_" + hotcueNumber + "_" + action;

    engine.setValue(group, valueName, true);
}

DenonSC3900.createHotcuePressHandler = function (hotcueNumber) {
    return function (channel, control, value, status, group) {
        DenonSC3900.hotcuePress(group, hotcueNumber)
    }
}

for (var i = 1; i <= DenonSC3900.getHotcuesCount(); i++) {
    var hotcuePressHandlerName = "hotcue" + i + "Press"

    // create hotcueXPress handlers
    DenonSC3900[hotcuePressHandlerName] = DenonSC3900.createHotcuePressHandler(i)
}

// #############################################################################
// ## SYNC management
// #############################################################################

// on SYNC button press
DenonSC3900.syncButtonPress = function (channel, control, value, status, group) {
    // A long press on the SYNC button (press and hold) should set the deck
    // as the sync master.
    // A short press on the SYNC button should toggle the sync feature for this
    // deck.

    DenonSC3900.syncButtonRegistry.recordPressTimestamp(group)

    engine.beginTimer(
        DenonSC3900.LONG_PRESS_THRESHOLD_MS,
        function () {
            if (DenonSC3900.syncButtonRegistry.isPressed(group)) {
                // the SYNC button is still pressed after the elapsed threshold,
                // set this deck as the sync master.
                engine.setValue(group, "sync_master", true);
            }
        },
        true
    );
}

// on SYNC button release
DenonSC3900.syncButtonRelease = function (channel, control, value, status, group) {
    var releaseTimestamp = DenonSC3900.getTimestampMs();
    var pressTimestamp = DenonSC3900.syncButtonRegistry.popPressTimestamp(group);

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
DenonSC3900.pitchFaderMsb = function (channel, control, value, status, group) {
    DenonSC3900.pitchFaderMsbRegistry.setPitchFaderMsb(group, value);
}

// on pitch fader LSB change
DenonSC3900.pitchFaderLsb = function (channel, control, value, status, group) {
    var msbValue = DenonSC3900.pitchFaderMsbRegistry.getPitchFaderMsb(group);

    // The `fullValue` number is determined by two number contained on a 7bits
    // sequence. As a 7 bit sequence can contain 128 values (0-127), the
    // `fullValue` number can contain 128*128 values : 0-16383.
    var fullValue = (msbValue << 7) + value;

    // When fullValue == 0 (min), the pitch fader is at the top position.
    // When fullValue == 8192 (middle), the pitch fader is at the center position.
    // When fullValue == 16383 (max), the pitch fader is at the bottom position.

    // rate [-1; 1]
    var rate = (fullValue - 8192) / 8192;

    // Somehow mixxx is inverting the rate (i.e. the positive pitch area is
    // understood as the negative area and vice versa), so we fix it here by
    // multiplying the rate by -1.
    engine.setValue(group, "rate", rate * -1);
}

// #############################################################################
// ## Jog wheel management
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
    if (!DenonSC3900.isPlaying(group)) {
        DenonSC3900.enableScratching(group);

        return
    }

    DenonSC3900.vinylModeRegistry.isVinylModeActivated(group)
        ? DenonSC3900.enableScratching(group)
        : DenonSC3900.disableScratching(group)
    ;
}

// on jog wheel bend change
DenonSC3900.jogWheelBend = function (channel, control, value, status, group) {
    DenonSC3900.jogWheelBendRegistry.setJogWheelBend(group, value);
}

// on jog wheel tiny movement walked pulses change
DenonSC3900.jogWheelTinyMovementWalkedPulses = function (channel, control, value, status, group) {
    DenonSC3900.jogWheelTinyMovementWalkedPulsesRegistry
        .setJogWheelTinyMovementWalkedPulses(group, value)
    ;
}

// on jog wheel pulse width MSB change
DenonSC3900.jogWheelPulseWidthMsb = function (channel, control, value, status, group) {
    DenonSC3900.jogWheelPulseWidthMsbRegistry.setJogWheelPulseWidthMsb(group, value);
}

// on jog wheel pulse width LSB change
DenonSC3900.jogWheelPulseWidthLsb = function (channel, control, value, status, group) {
    if (DenonSC3900.dropJogWheelMidiSignalsRegistry.shouldDrop(group)) {
        // Ignore the wheel signal. The platter is probably changing its
        // state while playback is on, so we should not consider the slowing
        // or accelerating bends while the platter state change, in order to
        // avoid track pitch bends.
        return
    }

    var deckNumber = script.deckFromGroup(group);

    engine.isScratching(deckNumber)
        ? DenonSC3900.jogWheelScratch(group, deckNumber, value)
        : DenonSC3900.jogWheelPitchBend(group)
    ;
}

/**
 * @param string group
 * @param number deckNumber
 * @param number pulseWidthLsb
 */
DenonSC3900.jogWheelScratch = function (group, deckNumber, pulseWidthLsb) {
    // The jog bend value is centered on 64 (0x40)
    var jogBendValue = DenonSC3900.jogWheelBendRegistry.getJogWheelBend(group);
    var direction = jogBendValue < 64
        ? -1
        : 1
    ;

    // The duration the vinyl disc took to walk through a pulse, in µs.
    var pulseWidth = 0; // init var

    // > 0 when the vinyl disc is moved on a tiny movement (e.g. when moving it
    // by tiny distances with the fingers).
    // This data is sent by the SC3900 unit to increase vinyl disc movement
    // information precision.
    // This value is [0-127].
    var tinyMovementWalkedPulses = DenonSC3900
        .jogWheelTinyMovementWalkedPulsesRegistry
        .getJogWheelTinyMovementWalkedPulses(group)
    ;

    if (0 !== tinyMovementWalkedPulses) {
        // The vinyl disc is moved on a tiny movement.

        // The percentage of a complete revolution that this tiny movement
        // represents.
        var walkedPulsesRatio = tinyMovementWalkedPulses
            / DenonSC3900.PLATTER_TINY_MOVEMENT_PULSES_COUNT_PER_REVOLUTION
        ;

        // Adapt this tiny movement to the normal movement pulse scale.
        // As the `pulseWidth` represents a duration, the ratio is applied
        // with a division instead of a multiplication to produce a high
        // number, as we're making tiny movements (so it takes longer to
        // walk pulses).
        pulseWidth = DenonSC3900.PLATTER_PULSE_WIDTH / walkedPulsesRatio;
    } else {
        // The vinyl disc is moved on a non tiny movement.
        var pulseWidthMsb = DenonSC3900
            .jogWheelPulseWidthMsbRegistry
            .getJogWheelPulseWidthMsb(group)
        ;

        var transmittedValue = ((pulseWidthMsb << 7) + pulseWidthLsb);

        // The transmittedValue is the pulseWidth internally computed by the
        // SC3900 to walk two pulses, we transform it to the duration
        // between two pulses (i.e. the pulseWidth of a single pulse).
        pulseWidth = transmittedValue * 0.5;
    }

    // The speed ratio at which the vinyl disc is rotating.
    // 1 : same speed as the platter.
    // < 1 : slower than the platter.
    // > 1 : faster than the platter.
    // 0 : stopped.
    // The lower the pulseWidth is, the higher is the ratio as the pulseWidth
    // represents the duration between two pulses.
    var speedRatio = 0 === pulseWidth // prevent divide by 0
        ? 0
        : DenonSC3900.PLATTER_PULSE_WIDTH / pulseWidth
    ;

    engine.setValue(group, "scratch2", speedRatio * direction);
}

/**
 * @param string group
 */
DenonSC3900.jogWheelPitchBend = function (group) {
    // The jog bend value is centered on 64 (0x40)
    var jogBendValue = DenonSC3900.jogWheelBendRegistry.getJogWheelBend(group);

    var relativeValue = jogBendValue - 64;

    // divide by 20 to reduce mixxx sensibility
    var finalValue = relativeValue / 20;

    engine.setValue(
        group,
        "jog",
        finalValue * DenonSC3900.JOG_WHEEL_PITCH_BEND_SENSIBILITY
    );
}

// #############################################################################
// ## CUE management
// #############################################################################

// on CUE button press
DenonSC3900.cueButtonPress = function (channel, control, value, status, group) {
    engine.setValue(group, "cue_default", value);

    DenonSC3900.stopPlatter(
        DenonSC3900.getOutputMidiChannel(channel)
    );

    DenonSC3900.disableScratching(group);
}

// on CUE button release
DenonSC3900.cueButtonRelease = function (channel, control, value, status, group) {
    engine.setValue(group, "cue_default", value);

    // We should be able to scratch when on a CUE point to navigate through the
    // track.
    DenonSC3900.enableScratching(group);
}

// #############################################################################
// ## Play management
// #############################################################################

// on Play/Pause button press
DenonSC3900.playButtonPress = function (channel, control, value, status, group) {
    engine.setValue(group, "play", value); // internally toggled

    DenonSC3900.updatePlatterStatus(
        DenonSC3900.getOutputMidiChannel(channel),
        group
    );

    DenonSC3900.updateScratchingStatus(group);
}

// #############################################################################
// ## Vinyl mode management
// #############################################################################

// on VINYL button press
DenonSC3900.vinylButtonPress = function (channel, control, value, status, group) {
    DenonSC3900.vinylModeRegistry.toggleVinylMode(group);

    var outputChannel = DenonSC3900.getOutputMidiChannel(channel);

    var lightStatus = DenonSC3900.vinylModeRegistry.isVinylModeActivated(group)
        ? DenonSC3900.LIGHT_ON
        : DenonSC3900.LIGHT_OFF
    ;

    midi.sendShortMsg(outputChannel, lightStatus, DenonSC3900.VINYL_WRITE_ADDRESS);

    if (DenonSC3900.isPlaying(group)) {
        // When the playback is on, avoid to consider the jog wheel messages
        // while the platter is changing its state. Otherwise it will
        // produce pitch bends on the track due to jog wheel speed change
        // when the platter speed changes.
        // We also disable the scratching engine as we stop to consider the
        // jog wheel signals.
        DenonSC3900.dropJogWheelMidiSignalsRegistry.drop(group);
        DenonSC3900.disableScratching(group);

        engine.beginTimer(
            DenonSC3900.PLATTER_STATE_TRANSITION_DURATION_MS,
            function () {
                DenonSC3900.dropJogWheelMidiSignalsRegistry.accept(group);

                DenonSC3900.updateScratchingStatus(group);
            },
            true
        );
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
 */
DenonSC3900.rotatePlatter = function (outputChannel) {
    midi.sendShortMsg(
        outputChannel,
        DenonSC3900.PLATTER_WRITE_ADDRESS,
        DenonSC3900.PLATTER_ROTATE
    );
}

/**
 * Whether to rotate or stop the SC3900 platter, in function of the deck state.
 *
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.updatePlatterStatus = function (outputChannel, group) {
    if (!DenonSC3900.vinylModeRegistry.isVinylModeActivated(group)) {
        DenonSC3900.stopPlatter(outputChannel);

        return
    }

    DenonSC3900.isPlaying(group)
        ? DenonSC3900.rotatePlatter(outputChannel)
        : DenonSC3900.stopPlatter(outputChannel)
    ;
}
