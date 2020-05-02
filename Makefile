# How many single decks we plan to use. An XML mapping file will be built per
# deck (one deck in a dedicated channel).
SINGLE_DECKS_COUNT ?= 2

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
	find ./dist \
		-type f \
		\( -name "*.xml" -o -name "*.js" \) \
		-exec cp {} ~/.mixxx/controllers/ \;

################################################################################
## Build targets
################################################################################

.PHONY: build-single-decks
build-single-decks:
	./src/single-deck/build.sh

################################################################################
## Internal targets
################################################################################

.PHONY: .clear-dist-dir
.clear-dist-dir:
	@rm -rf dist/*
