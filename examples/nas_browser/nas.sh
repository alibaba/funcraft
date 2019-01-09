#!/bin/bash

set -e

SHELL_DIR="$(dirname $0)"

usage() {
    echo "usage:"
    echo -e "\t./nas.sh cp <src> fc:<dst>"
    echo -e "\t./nas.sh cp oss://<bucket>/<object> fc:<dst>"
    echo -e "\t./nas.sh ls <path>"
    echo -e "\t./nas.sh cat <path>"
    echo -e "\t./nas.sh unzip <path>"
    echo -e "\t./nas.sh bash <cmd>"
}

ENV_FILE=$(pwd)/.env

if [ -f $ENV_FILE ]; then
    . $ENV_FILE
fi

FC_URL=${FC_URL:-http://localhost:8000/2016-08-15/proxy/nasDemo/browser/}

checkArgs() {
    if [ -z "$1" ]; then
        usage
        exit -1
    fi
}

cp() {
    checkArgs $1
    checkArgs $2
    
    src=$1
    dst=$2


    if [[ "$dst" =~ ^'fc:/' ]]; then
        dstFile=${dst#fc:}
    else
        echo "dst must start with fc:/ prefix";
        exit 1
    fi

    if [[ "$src" =~ ^'oss:' ]]; then
        ossFile=$src

        curl -G -XPOST \
            $FC_URL"cp" \
            --data-urlencode "dst=$dstFile" \
            --data-urlencode "oss=$ossFile"

        exit 0
    fi

    if [[ "$src" =~ ^'/' ]]; then
        absSrcFile=$src
    elif [[ "$src" =~ ^'~' ]]; then
        absSrcFile=$HOME${dst#~}
    else
        currentDir=$(pwd)
        absSrcFile=$currentDir/$src
    fi

    if [ ! -f "$absSrcFile" ]; then 
        echo "file $absSrcFile not found."
    fi

    curl -XPOST \
        $FC_URL"cp?dst=$dstFile" \
        -F "file=@$absSrcFile"
}

ls() {
    dstDir=$1

    if [[ "$dstDir" =~ ^'fc:/' ]]; then
        dstDir=${dstDir#fc:}

        curl -G -XGET \
            $FC_URL"ls" \
            --data-urlencode "p=$dstDir"
    else
        echo "file must start with fc:/ prefix";
        exit 1
    fi
}

cat() {
    file=$1

    if [[ "$file" =~ ^'fc:/' ]]; then
        file=${file#fc:}

        curl -G -XGET \
            $FC_URL"cat" \
            --data-urlencode "file=$file"
    else
        echo "file must start with fc:/ prefix";
        exit 1
    fi
}

bash() {
    cmd=$(echo "$*")
    checkArgs $cmd

    curl -G -XPOST \
        $FC_URL"bash" \
        --data-urlencode "cmd=$cmd"
}

unzip() {
    checkArgs $1
    zipFile=$1
    
    if [[ "$zipFile" =~ ^'fc:/' ]]; then
        zipFile=${zipFile#fc:}

        curl -G -XPOST \
            $FC_URL"unzip" \
            --data-urlencode "file=$zipFile"
    else
        echo "file must start with fc:/ prefix";
        exit 1
    fi
}

case "$1" in
    cp ) cp $2 $3;;
    ls ) ls $2;; 
    cat ) cat $2;;
    unzip ) unzip $2;;
    bash ) shift; bash $@;;
    -- ) shift; break ;;
    "" ) usage ;;
    * ) usage; exit -1 ;;
esac




