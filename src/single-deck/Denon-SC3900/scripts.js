// @see https://www.mixxx.org/wiki/doku.php/midi_scripting

function DenonSC3900 () {}

// @see Denon manual
var LIGHT_ON = 0x4A

// @see Denon manual
var HOTCUES_WRITE_ADDRESSES = {
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

/**
 * Constructor for a registry which would indicate whether the CLR button is
 * being held down or not.
 */
function createClrButtonRegistry () {
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
    }
}

var clrButtonRegistry = createClrButtonRegistry()

/**
 * @param number inputChannel (0 based)
 *
 * @return string
 */
function getGroup (inputChannel) {
    var channelNumber = inputChannel + 1;

    return "[Channel" + channelNumber + "]";
}

/**
 * @param number inputChannel (0 based)
 *
 * @return number (hex)
 */
function getOutputMidiChannel (inputChannel) {
    // As specified in the Denon manual : signals must be sent on 0xBn where
    // n is the channel number [0-15].
    return 0xB0 + inputChannel;
}

/**
 * @param number outputChannel
 * @param string group
 */
function renderHotcuesLights (outputChannel, group) {
    for (var i = 1; i < 9; i++) {
        var settingName = "hotcue_" + i + "_position";

        var isHotcueSet = -1 !== engine.getValue(group, settingName)

        var destinationAddress = isHotcueSet
            ? HOTCUES_WRITE_ADDRESSES[i]["light"]
            : HOTCUES_WRITE_ADDRESSES[i]["dimmer"]
        ;

        midi.sendShortMsg(outputChannel, LIGHT_ON, destinationAddress);
    }
}

// on MIDIBANK switch
DenonSC3900.midiBankSwitch = function (channel) {
    // There is no way to know if the MIDIBANK2 is enabled on the Denon unit,
    // so we render the 8 hotcues lights to cover the two cases
    // (MIDIBANK2 enabled/disabled).
    renderHotcuesLights(
        getOutputMidiChannel(channel),
        getGroup(channel)
    )
}

// on CLR button press
DenonSC3900.clrButtonPress = function (channel) {
    clrButtonRegistry.buttonPressed(getGroup(channel))
}

// on CLR button release
DenonSC3900.clrButtonRelease = function (channel) {
    clrButtonRegistry.buttonReleased(getGroup(channel))
}

// on a hotcue press
function hotcuePress (inputChannel, hotcueNumber) {
    var group = getGroup(inputChannel)

    var action = clrButtonRegistry.isPressed(group)
        ? "clear"
        : "activate"
    ;

    var valueName = "hotcue_" + hotcueNumber + "_" + action;

    engine.setValue(group, valueName, true);
}

function createHotcuePressHandler (hotcueNumber) {
    return function (channel) {
        hotcuePress(channel, hotcueNumber)
    }
}

for (var i = 1; i < 9; i++) {
    var hotcuePressHandlerName = "hotcue" + i + "Press"

    // create hotcueXPress handlers
    DenonSC3900[hotcuePressHandlerName] = createHotcuePressHandler(i)
}
