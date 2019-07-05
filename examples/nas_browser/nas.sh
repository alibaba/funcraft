#!/bin/bash

set -e

SHELL_DIR="$(dirname $0)" 

chunkSize='95k'
splitNameLen=10

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
        echo "dst must start with fc:/ prefix"
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
        absSrcFile=$HOME${src#~} 
    else
        currentDir=$(pwd)
        absSrcFile=$currentDir/$src
    fi

    if [ ! -f "$absSrcFile" ]; then
        echo "file $absSrcFile not found."
    fi
    
    if [ -f "$absSrcFile" ]; then
        srcFile=absSrcFile
        absSrcFileHash=$(md5sum ${absSrcFile} | awk '{ print $1 }')
    fi

    filename="$(basename "$absSrcFile")" 

    cp_http_response=$(curl --silent --write-out "cp_http_status:%{http_code}" -G -XPOST \
        $FC_URL"cp" \
        --data-urlencode "file_hash=$absSrcFileHash" \
        --data-urlencode "dst=$dstFile" \
        --data-urlencode "dst_file_name=$filename")

    cp_http_body=$(echo $cp_http_response | sed -e 's/cp_http_status\:.*//g')
    cp_http_status=$(echo $cp_http_response | tr -d '\n' | sed -e 's/.*cp_http_status://')
    echo "$cp_http_body"

    if [ "$cp_http_status" -eq "200" ]; then
        curDir="$(dirname "$absSrcFile")" 
        tmpDir="$curDir/$filename"        
        tmpDir+="-split"

        if [ ! -d "$tmpDir" ]; then
            mkdir $tmpDir
        fi

        split -b $chunkSize -a $splitNameLen $absSrcFile "$tmpDir/$filename-" 

        declare -a splitFileArr
        declare -a fileHashArr
        len=0
        for entry in "$tmpDir"/*; do
            splitFileArr[${len}]=$entry
            
            fileHashArr[${len}]=$(md5sum ${entry} | awk '{ print $1 }')
            ((len++))
        done

        seq=0
        upload_fail=0
        for sf in "${splitFileArr[@]}"; do
            upload_http_response=$(curl  --silent --write-out "upload_http_status:%{http_code}" -XPOST \
                $FC_URL"upload?file_hash=${fileHashArr[$seq]}&chunk_id=$seq&chunk_sum=$len&dst=$dstFile&task_id=$absSrcFileHash" \
                -F "file=@$sf") 
            
            upload_http_status=$(echo $upload_http_response | tr -d '\n' | sed -e 's/.*upload_http_status://')
            
            if [ $upload_http_status -ne 200 ]; then
                upload_fail=1
                break
            fi

            ((seq++))
        done
        if [ $upload_fail -eq 0 ]; then
            curl -G -XPOST \
                $FC_URL"join" \
                --data-urlencode "task_id=$absSrcFileHash" \
                --data-urlencode "dst=$dstFile" \
                --data-urlencode "dst_file_name=$filename"
        fi
        rm -r $tmpDir
    fi
}

ls() {
    dstDir=$1

    if [[ "$dstDir" =~ ^'fc:/' ]]; then
        dstDir=${dstDir#fc:}

        curl -G -XGET \
            $FC_URL"ls" \
            --data-urlencode "p=$dstDir"
    else
        echo "file must start with fc:/ prefix"
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
        echo "file must start with fc:/ prefix"
        exit 1
    fi
}

bash() {
    cmd=$(echo "$*") # $* 以一个单字符串显示所有向脚本传递的参数。
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
        echo "file must start with fc:/ prefix"
        exit 1
    fi
}

case "$1" in
cp) cp $2 $3 ;;
ls) ls $2 ;;
cat) cat $2 ;;
unzip) unzip $2 ;;
bash)
    shift
    bash $@
    ;;
--)
    shift
    break
    ;;
"") usage ;;
*)
    usage
    exit -1
    ;;
esac
