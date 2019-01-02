#!/bin/bash

docker run --rm --name mssql-builder -t -d -v $(pwd):/code --entrypoint /bin/sh aliyunfc/runtime-python3.6
docker exec -t mssql-builder pip install -t /code pymssql
docker stop mssql-builder