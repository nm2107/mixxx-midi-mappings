// @see https://www.mixxx.org/wiki/doku.php/midi_scripting

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
DenonSC3900.DUMP_WRITE_ADDRESS = 0x29
DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS = 0x59
DenonSC3900.SELECT_WRITE_ADDRESS = 0x1E

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
 * Constructor for a registry which would host the MSB value of the pitch fader.
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
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.DUMP_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SHIFT_LOCK_WRITE_ADDRESS);
    midi.sendShortMsg(outputChannel, DenonSC3900.LIGHT_OFF, DenonSC3900.SELECT_WRITE_ADDRESS);
}

// on mixxx shutdown
DenonSC3900.shutdown = function () {
    // As we don't have the channel information for the SC3900 decks during
    // init or shutdown functions, we blindly assume that all the mixxx decks
    // are SC3900.
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
        var settingName = "hotcue_" + i + "_position";

        var isHotcueSet = -1 !== engine.getValue(group, settingName)

        var destinationAddress = isHotcueSet
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

    var rate = (fullValue - 8192) / 8192;

    // Somehow mixxx is inverting the rate (i.e. the positive pitch area is
    // understood as the negative area and vice versa), so we fix it here by
    // multiplying the rate by -1.
    engine.setValue(group, "rate", rate * -1);
}
