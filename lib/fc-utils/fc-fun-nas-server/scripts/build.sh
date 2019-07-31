#!/bin/bash

npm run build
mkdir -p ./dist/.fun/root
cp -r ./.fun/root/ ./dist/.fun/root