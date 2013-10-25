
build: components index.js
	@component build

components: component.json
	@component install

test: build test/build
	@cd test && serve

test/build:
	@ln -s build $@

clean:
	rm -fr build components template.js

.PHONY: clean test
