#!/bin/bash
set -e

PKG_VERSION=`node -p "require('./package').version"`

targets=("node8-linux-x64" "node8-macos-x64" "node8-win-x64")
outputs=("fun-v${PKG_VERSION}-linux-x64" "fun-v${PKG_VERSION}-macos-x64" "fun-v${PKG_VERSION}-win-x64.exe")

mkdir -p output

## rename and zip output files
for i in "${!targets[@]}";
do 
	target=${targets[$i]}
	filename=${outputs[$i]}
	pkg -t $target --output output/$filename .
	
	cd output
	zip $filename.zip $filename
	rm $filename
	cd ..
done