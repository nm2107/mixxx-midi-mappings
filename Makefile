# How many single decks we plan to use. An XML mapping file will be built per
# deck (one deck in a dedicated channel).
SINGLE_DECKS_COUNT ?= 2
MIXXX_PATH ?= ~/.mixxx

# Make the vars declared in this Makefile available to scripts called there.
export

################################################################################
## General targets
################################################################################

.PHONY: all
all: build install

.PHONY: build
build: .clear-dist-dir build-single-decks

.PHONY: install
install:
	@find ./dist \
		-type f \
		\( -name "*.xml" -o -name "*.js" \) \
		-exec cp {} $(MIXXX_PATH)/controllers/ \;
	@echo "Installation complete."

################################################################################
## Build targets
################################################################################

.PHONY: build-single-decks
build-single-decks: .assert-single-decks-count
	@./src/single-deck/build.sh
	@echo "Single deck mappings built."

################################################################################
## Internal targets
################################################################################

.PHONY: .clear-dist-dir
.clear-dist-dir:
	@rm -rf dist/*

.PHONY: .assert-single-decks-count
.assert-single-decks-count:
	@if [[ "$(SINGLE_DECKS_COUNT)" -lt "1" ]] ; then \
		echo "SINGLE_DECKS_COUNT must be > 0." >&2 ; \
		exit 1; \
	fi
