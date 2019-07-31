#!/bin/bash
cd ./dist
zip -r fun-nas-server.zip  * .[^.]* -x "*.zip" -x ".fun/root/usr/share/*"