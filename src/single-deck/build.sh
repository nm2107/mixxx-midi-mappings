#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
[[ "${DEBUG:-}" != "" ]] && set -o xtrace

HERE_PATH="$(dirname "${0}")"

source "${HERE_PATH}/../utils.sh"

# @param $1 deck_path
build_deck () {
    local deck_model="$(basename "${1}")"
    local dist_dir="${HERE_PATH}/../../dist/single-deck/${deck_model}"

    mkdir -p "${dist_dir}"

    # copy XML files (one per channel)
    for (( deck_number=1; deck_number<=$SINGLE_DECKS_COUNT; deck_number++ )); do
        local deck_dist_path="${dist_dir}/${deck_model}_Deck${deck_number}.midi.xml"

        cp "${HERE_PATH}/${deck_model}/Deck1.midi.xml" "${deck_dist_path}"

        if [[ "${deck_number}" -gt "1" ]]; then
            sed -i "s/Deck1/Deck${deck_number}/g" "${deck_dist_path}"
            sed -i "s/Channel1/Channel${deck_number}/g" "${deck_dist_path}"

            if [[ -f "${HERE_PATH}/${deck_model}/update_built_deck.sh" ]]; then
                "${HERE_PATH}/${deck_model}/update_built_deck.sh" "${deck_dist_path}" "${deck_number}"
            fi
        fi
    done

    # copy JS file
    cp "${HERE_PATH}/${deck_model}/scripts.js" "${dist_dir}/${deck_model}-scripts.js"
}

main () {
    local deck_paths="$(list_dirs "${HERE_PATH}")"

    for deck_path in "${deck_paths[@]}"; do
        build_deck "${deck_path}"
    done
}

main
