// @see https://www.mixxx.org/wiki/doku.php/midi_scripting

function DenonSC3900 () {}

/**
 * @param number inputChannel 0 based.
 *
 * @return number (hex)
 */
DenonSC3900.getOutputMidiChannel = function (inputChannel) {
    // As specified in the Denon manual : signals must be sent on 0xBn where
    // n is the channel number [0-15].
    return 0xB0 + inputChannel;
}

DenonSC3900.renderHotcuesLights = function (inputChannel) {
    var outputChannel = DenonSC3900.getOutputMidiChannel(inputChannel)

    // light on all hotcues dimmer lights
    midi.sendShortMsg(outputChannel, 0x4A, 0x12) // light on hotcue 1 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x14) // light on hotcue 2 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x16) // light on hotcue 3 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x18) // light on hotcue 4 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x32) // light on hotcue 5 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x34) // light on hotcue 6 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x36) // light on hotcue 7 dummer light
    midi.sendShortMsg(outputChannel, 0x4A, 0x38) // light on hotcue 8 dummer light
}

DenonSC3900.midiBankSwitch = function (channel, control, value, status) {
    // There is no way to know if the MIDIBANK2 is enabled on the denon unit,
    // so we light all the dimmers to cover the two cases
    // (MIDIBANK2 enabled/disabled).
    DenonSC3900.renderHotcuesLights(channel)
}
