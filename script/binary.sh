#!/bin/bash
set -e

PKG_VERSION=`node -p "require('./package').version"`

## package to binary
pkg -t node8-linux-x64,node8-macos-x64,node8-win-x64 --out-path output .

## rename and zip output files
cd output
for f in fun-*; 
do 
	filename=fun-v${PKG_VERSION}${f##*fun}
	mv $f $filename
	zip $filename.zip $filename
	rm $filename
done