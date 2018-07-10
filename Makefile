TEST_FOLDER = ./test/
TEST_FILES = *.test.js
REPORTER = spec
TIMEOUT = 20000
MOCHA = ./node_modules/mocha/bin/_mocha
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash

lint:
	@eslint --fix lib bin test

test: lint
	@mocha $(TEST_FOLDER) -t $(TIMEOUT) -R spec --recursive -name $(TEST_FILES)

test-cov:
	@nyc --reporter=html --reporter=text mocha $(TEST_FOLDER) -t $(TIMEOUT) -R spec --recursive -name $(TEST_FILES)

test-coveralls:
	@nyc mocha -t $(TIMEOUT) -R spec $(TESTS)
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@nyc report --reporter=text-lcov | coveralls

clean: 
	@rm -rf output

binary: clean
	@script/binary.sh

upload: 
	@script/upload.sh

.PHONY: test clean binary