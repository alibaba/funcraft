TEST_FOLDER ?= ./test/
TEST_FILES ?= *.test.js
REPORTER = spec
TIMEOUT = 20000
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
FUN = ../../../bin/fun.js

lint:
	@npm run lint

unit-test:
	@mocha $(TEST_FOLDER) -t $(TIMEOUT) -R spec --recursive -name $(TEST_FILES) --grep '^(?!Integration::).*'

test: lint unit-test

install:
	env -i PATH="$(PATH)" npm install

clean:
	rm -rf ./dist

build: clean install
	env -i PATH="$(PATH)" npm run build
	mkdir -p ./dist/.fun/root
	cp -r ./.fun/root/ ./dist/.fun/root
	git log -n 1 --pretty="format:%h" -- . > ./dist/VERSION

dev:
	npm run dev
	$(FUN) local start

package: build
	cd ./dist && zip -r fun-nas-server.zip  * .[^.]* -x "*.zip" -x ".fun/root/usr/share/*"


