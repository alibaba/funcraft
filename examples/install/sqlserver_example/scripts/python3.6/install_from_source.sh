#!/bin/bash

docker run --rm --name mssql-builder -t -d -v $(pwd):/code --entrypoint /bin/sh aliyunfc/runtime-python3.6

docker exec -t mssql-builder apt-get install -y -d -o=dir::cache=/code libsybdb5
docker exec -t mssql-builder bash -c 'for f in $(ls /code/archives/*.deb); do dpkg -x $f $(pwd) ; done;'
docker exec -t mssql-builder bash -c "rm -rf /code/archives/; mkdir /code/lib;cd /code/lib; ln -sf ../usr/lib/x86_64-linux-gnu/libsybdb.so.5 ."
docker exec -t mssql-builder apt-get install -y freetds-dev 
docker exec -t mssql-builder pip install cython 
#docker exec -t mssql-builder pip install --no-binary :all: -t /code pymssql==2.1.2
docker exec -t mssql-builder pip install -t /code pymssql==2.1.3

docker stop mssql-builder