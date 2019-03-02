#!/bin/bash
set -e

if ! [ -x "$(command -v ossutil)" ]; then

    case "$OSTYPE" in
    darwin*)
        # install home brew if missing
        if ! [ -x "$(command -v brew)" ]; then
            /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
        fi
        brew tap vangie/formula
        brew install ossutil
        ;; 
    *)        
        echo "'ossutil' command is missing." 
        exit -1
        ;;
    esac
fi

OSS_CFG_FILE=./.oss_cfg
ENDPOINT=cn-hangzhou.oss.aliyun-inc.com

echo "Try to load OSS config from $OSS_CFG_FILE"
if [ -f $OSS_CFG_FILE ]; then
    source $OSS_CFG_FILE
fi

if [ -z ${OSS_ACCESS_KEY_ID+x} ]; then
    echo -n "OSS Access Key ID:"
    read OSS_ACCESS_KEY_ID
fi

if [ -z ${OSS_ACCESS_KEY_SECRET+x} ]; then
    echo -n "OSS Access Key SECRET:"
    read OSS_ACCESS_KEY_SECRET
fi

cat >$OSS_CFG_FILE <<EOL
OSS_ACCESS_KEY_ID=$OSS_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=$OSS_ACCESS_KEY_SECRET
EOL

VERSION=`node -p "require('./package').version"`
CHECK_FILE=oss://oss-attachment/fun/fun-v${VERSION}-linux-x64.zip

if ossutil ls $CHECK_FILE --endpoint $ENDPOINT --access-key-id $OSS_ACCESS_KEY_ID --access-key-secret $OSS_ACCESS_KEY_SECRET  | grep "Object Number is: 1" > /dev/null ; then
    echo "Version $VERSION is already uploaded!"
    exit -1
fi

cd output

files=()

for p in *.zip
do
    echo $p
    ossutil cp $p oss://oss-attachment/fun/$p --endpoint $ENDPOINT --access-key-id $OSS_ACCESS_KEY_ID --access-key-secret $OSS_ACCESS_KEY_SECRET
    files+=($p)
done

echo ""
echo "All uploaded success!"
echo "====================================="
for f in "${files[@]}"
do
   echo "[$f](https://gosspublic.alicdn.com/fun/$f)"
done
