POE_UI := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

### Add node_modules executables to the path

LOCAL_PATH := $(CURDIR)/node_modules/.bin:$(POE_UI)/node_modules/.bin
PATH := $(LOCAL_PATH):$(PATH)

### General targets

start: node_modules .env
	@$(shell cat .env | grep '^#' --invert-match | xargs) npm start

clean:
	rm -fr build components manifest.json

### Install targets

.env: .env.example
	@cp $< $@

node_modules:
	@npm install

### Build targets

prod:
	@mkdir -p build
	@PATH=$(PATH) MANIFEST=manifest.json webpack --bail --config $(POE_UI)/webpack.config.js --output-path build

.PHONY: clean build prod install
