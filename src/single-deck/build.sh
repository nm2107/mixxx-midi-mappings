#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
[[ "${DEBUG:-}" != "" ]] && set -o xtrace

HERE_PATH="$(dirname "${0}")"

source "${HERE_PATH}/../utils.sh"

# @param $1 deck_path
# @param $2 module_name
build_deck () {
    local deck_name="$(basename "${1}")"
    local deck_dist_dir="${HERE_PATH}/../../dist/${2}/${deck_name}"

    mkdir -p "${deck_dist_dir}"

    for (( deck_channel=1; deck_channel<=$SINGLE_DECKS_COUNT; deck_channel++ )); do
        local channel_dist_path="${deck_dist_dir}/${deck_name}_Channel${deck_channel}.midi.xml"

        cp "${HERE_PATH}/${deck_name}/Channel1.midi.xml" "${channel_dist_path}"

        if [[ "${deck_channel}" -gt "1" ]]; then
            sed -i "s/Deck1/Deck${deck_channel}/g" "${channel_dist_path}"
            sed -i "s/Channel1/Channel${deck_channel}/g" "${channel_dist_path}"
        fi
    done
}

main () {
    # use a `module_name` var instead of hardcoding the `single-deck` path
    local module_name="$(basename "${HERE_PATH}")"

    local deck_paths="$(list_dirs "${HERE_PATH}")"

    for deck_path in "${deck_paths[@]}"; do
        build_deck "${deck_path}" "${module_name}"
    done
}

main
