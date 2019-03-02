# -*- coding:utf-8 -*-   
import sys
import zipfile
import os
import oss2
import imp
import time

app_lib_object = os.environ['AppLibObject']
app_lib_dir = os.environ['AppLibDir']

model_object = os.environ['ModelObject']
model_dir = os.environ['ModelDir']

local = bool(os.getenv('local', ""))

print 'local running: ' + str(local)

initialized = False

def download_and_unzip_if_not_exist(objectKey, path, context):
    
    creds = context.credentials

    if (local):
        print 'thank you for running function in local!!!!!!'
        auth = oss2.Auth(creds.access_key_id,
                         creds.access_key_secret)
    else:
        auth = oss2.StsAuth(creds.access_key_id,
                            creds.access_key_secret,
                            creds.security_token)

    endpoint = os.environ['Endpoint']
    bucket = os.environ['Bucket']

    print 'objectKey: ' + objectKey
    print 'path: ' + path
    print 'endpoint: ' + endpoint
    print 'bucket: ' + bucket

    bucket = oss2.Bucket(auth, endpoint, bucket) 
    
    zipName = '/tmp/tmp.zip'

    print 'before downloading ' + objectKey + ' ...'
    start_download_time = time.time()
    bucket.get_object_to_file(objectKey, zipName)
    print 'after downloading, used %s seconds...' % (time.time() - start_download_time)

    if not os.path.exists(path):
        os.mkdir(path)

    print 'before unzipping ' + objectKey + ' ...'
    start_unzip_time = time.time()
    with zipfile.ZipFile(zipName, "r") as z:
        z.extractall(path)
    print 'unzipping done, used %s seconds...' % (time.time() - start_unzip_time)

def handler(event, context):
    global initialized
    if not initialized:
        if ( not local ):
            download_and_unzip_if_not_exist(app_lib_object, app_lib_dir, context) 
            download_and_unzip_if_not_exist(model_object, model_dir, context)
        sys.path.insert(1, app_lib_dir)
        print sys.path
        initialized = True

    file_handle, desc = None, None
    
    fn, modulePath, desc = imp.find_module('index')
    mod = imp.load_module('index', fn, modulePath, desc)

    request_handler = getattr(mod, 'handler')
    return request_handler(event, context)          