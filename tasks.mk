PROJECT      ?= $(notdir $(CURDIR))
DESCRIPTION  ?= A poe ui app
ORGANIZATION ?= $(PROJECT)
REPO         ?= $(ORGANIZATION)/$(PROJECT)
NG_VERSION   ?= *

POE_UI := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
PATH := $(POE_UI)/node_modules/.bin:$(PATH)

include $(POE_UI)/node_modules/poe-ui-kit/build.mk

DIRS  = $(shell find $(POE_UI)/files -type d -name '*[a-zA-Z]' | sed 's:^$(POE_UI)/files/::')
FILES = $(shell find $(POE_UI)/files -type f                   | sed 's:^$(POE_UI)/files/::')

### Init files
init: $(DIRS) $(FILES) init_install install

init_install:
	@echo 'Installing remaining dependencies...'
	@npm install --silent

$(DIRS):
	@mkdir -p $@

$(FILES):
	@awk '{gsub(/PROJECT/, "$(PROJECT)"); gsub(/DESCRIPTION/, "$(DESCRIPTION)"); gsub(/REPO/, "$(REPO)"); gsub(/NG_VERSION/, "$(NG_VERSION)");print}' \
		$(POE_UI)/files/$@ > $@

.PHONY: init init_install
