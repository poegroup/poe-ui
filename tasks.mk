POE_UI := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

include $(POE_UI)/node_modules/poe-ui-kit/build.mk
