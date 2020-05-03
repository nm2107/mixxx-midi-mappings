#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
[[ "${DEBUG:-}" != "" ]] && set -o xtrace

# Usage: update_built_deck.sh "file_to_update" "deck_number"

main () {
    local file_to_update="${1}"
    local deck_number="${2}"

    local midi_channel_dec=$(($deck_number-1))
    local midi_channel_hex="$(printf '%x\n' "${midi_channel_dec}" | tr a-f A-F)"

    # Update the MIDI channel source and dest for this deck.
    # See the Denon manual for more infos.
    # SC3900 MIDI channel [0-15] (dec), so [0-F] (hex).
    sed -i "s/0x90/0x9${midi_channel_hex}/g" "${file_to_update}"
    sed -i "s/0x80/0x8${midi_channel_hex}/g" "${file_to_update}"
    sed -i "s/0xB0/0xB${midi_channel_hex}/g" "${file_to_update}"
}

main "${1}" "${2}"
