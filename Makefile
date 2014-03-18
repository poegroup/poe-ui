
build: components index.js
	@component build

components: component.json
	@component install

test: test-cli

test-cli: test-cli-create

test-cli-create:
	@./test/cli/create

clean:
	rm -fr build components template.js

.PHONY: clean test
