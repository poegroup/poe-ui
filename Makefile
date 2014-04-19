
build: components index.js
	@component build

components: component.json
	@component install

test:
	@NODE_ENV=test ./node_modules/.bin/mocha test/*/*.test.js

clean:
	rm -fr build components template.js

.PHONY: clean test
