// @see https://www.mixxx.org/wiki/doku.php/midi_scripting

function DenonSC3900 () {}

// @see Denon manual
var LIGHT_ON = 0x4A
var LIGHT_OFF = 0x4B
var LIGHT_BLINK = 0x4C

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
 * @param number inputChannel (0 based)
 *
 * @return string
 */
DenonSC3900.getGroup = function (inputChannel) {
    var channelNumber = inputChannel + 1;

    return "[Channel" + channelNumber + "]";
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
 * @param number outputChannel
 * @param string group
 */
DenonSC3900.renderHotcuesLights = function (outputChannel, group) {
    for (var i = 1; i < 9; i++) {
        var settingName = "hotcue_" + i + "_position";

        var isHotcueSet = -1 != engine.getValue(group, settingName)

        var destinationAddress = isHotcueSet
            ? HOTCUES_WRITE_ADDRESSES[i]["light"]
            : HOTCUES_WRITE_ADDRESSES[i]["dimmer"]
        ;

        midi.sendShortMsg(outputChannel, LIGHT_ON, destinationAddress);
    }
}

DenonSC3900.midiBankSwitch = function (channel, control, value, status) {
    // There is no way to know if the MIDIBANK2 is enabled on the denon unit,
    // so we light all the dimmers to cover the two cases
    // (MIDIBANK2 enabled/disabled).
    DenonSC3900.renderHotcuesLights(
        DenonSC3900.getOutputMidiChannel(channel),
        DenonSC3900.getGroup(channel)
    )
}
