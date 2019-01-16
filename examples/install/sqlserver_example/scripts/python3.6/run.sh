#!/bin/bash

docker run --rm -v $(pwd):/code aliyunfc/runtime-python3.6 --handler index.handler