#!/bin/bash
cd cpp_runtime
rm -rf release
mkdir -p release
cd release
cmake -DCMAKE_BUILD_TYPE=Release ..
make
cd ../../
cd sample
rm -rf release
mkdir -p release
cd release
cmake -DCMAKE_BUILD_TYPE=Release ..
make
chmod +x /tmp/bin/bootstrap
rm -rf /tmp/cpp_runtime/release
rm -rf /tmp/sample/release

