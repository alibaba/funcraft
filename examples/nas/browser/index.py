#!/usr/bin/env python
# coding=utf-8
from flask import Flask
from flask import request
from flask import make_response
from flask import send_from_directory, send_file
import subprocess

import oss2
import sys
import os
import zipfile
import shutil
import hashlib

import logging

logger = logging.getLogger()

app = Flask(__name__)


@app.route('/ls', methods=['GET'])
def ls(p = ''):
    p = request.args.get('p', default = '', type=str)

    path = os.path.join('/', p)
    
    if os.path.isdir(path):
        dirs = os.listdir(path)
    elif os.path.isfile(path):
        dirs = [os.path.basename(path)]
    else:
        return make_response('invliad path')
    
    resp = make_response('\n'.join(dirs), 200)
    return resp

@app.route('/cp', methods=['POST','GET'])
def cp():
    p = request.args.get('dst', default = '', type=str)
    
    logger.info("cp path parameter is " + p)

    path = os.path.join('/', p)
    
    oss_url = request.args.get('oss', default = '', type=str)

    file_id = request.args.get('file_hash', default = '', type=str)
        
    dst_file_name = request.args.get('dst_file_name', default = '', type=str)

    if oss_url:
        if os.path.isdir(path):     
            return make_response('dir is not support')

        global auth
        oss_endpoint = os.getenv('OSS_ENDPOINT')
        
        bucket_and_object = oss_url[len('oss://'):]
        
        index = bucket_and_object.index('/')
        bucket = bucket_and_object[:index]
        object_key = bucket_and_object[index + 1:]

        logger.info('oss endpoint is ' + oss_endpoint)
        logger.info('bucket is ' + bucket)
        logger.info('object_key is ' + object_key)
    
        bucket = oss2.Bucket(auth, oss_endpoint, bucket)

        bucket.get_object_to_file(object_key, path)
        
        return make_response('copy from ' + oss_url + ' to fc:' + path)
    else:
        if path.endswith('/') or os.path.isdir(path):
            tmp_dir = os.path.join(path, '.temp')
            path = os.path.join(path, dst_file_name)
        else:
            tmp_dir = os.path.join(os.path.dirname(path), '.temp')
        
        if not os.path.isfile(path):
            try:
                os.makedirs(tmp_dir)
            except OSError as e:
                logger.info(str(e))

            html = 'start upload files' + path + '\n'
            resp = make_response(html,200)
        else:
            with open(path, "rb") as f:
                exist_file_id = hashlib.md5(f.read()).hexdigest()
            
            if file_id == exist_file_id:
                html = 'file already exists\n'
                resp = make_response(html,201)
            else:
                try:
                    os.makedirs(tmp_dir)
                except OSError as e:
                    logger.info(str(e))
                
                html = ' start override files\n'
                resp = make_response(html, 200)
        return resp

@app.route('/upload', methods=['POST'])
def upload():
    task_id = request.args.get('task_id', default = '', type=str)

    file_id = request.args.get('file_hash', default = '', type=str)

    chunk_id = request.args.get('chunk_id', default = -1, type=int)

    chunk_sum = request.args.get('chunk_sum', default = -1, type=int)

    p = request.args.get('dst', default = '', type=str)

    path = os.path.join('/', p)
    
    if path.endswith('/') or os.path.isdir(path):
        tmp_dir = os.path.join(path, '.temp')
    else:
        tmp_dir = os.path.join(os.path.dirname(path), '.temp')
    
    file = request.files['file']
    upload_file_id = hashlib.md5(file.read()).hexdigest()
    file.seek(0)
    
    if file_id == upload_file_id:
        dst_file_name = '%s%s' % (task_id, chunk_id)
        dst = os.path.join(tmp_dir, dst_file_name)
        file.save(dst)
        upload_percent = float(chunk_id + 1)/float(chunk_sum)
        html = '{:.0%}'.format(upload_percent) + '  '
        
        return make_response(html, 200)
    else:
        html = 'upload failed!\n'
        shutil.rmtree(tmp_dir)
        return make_response(html, 400)

@app.route('/join', methods=['POST'])
def join():
    task_id = request.args.get('task_id', default = '', type=str)

    p = request.args.get('dst', default = '', type=str)

    path = os.path.join('/', p)

    dst_file_name = request.args.get('dst_file_name', default = '', type=str)
    
    if path.endswith('/') or os.path.isdir(path):
        tmp_dir = os.path.join(path, '.temp')
    else:
        tmp_dir = os.path.join(os.path.dirname(path), '.temp')
    
    split_file = task_id + '*'
    join_src = os.path.join(tmp_dir, split_file)
    
    if path.endswith('/') or os.path.isdir(path):
        join_dst = os.path.join(path, dst_file_name)
    else:
        join_dst = path
        
    my_cmd = 'cat  ' + join_src + '> ' + join_dst
    os.system(my_cmd)

    shutil.rmtree(tmp_dir)

    with open(join_dst, "rb") as f:
        join_dst_id = hashlib.md5(f.read()).hexdigest()
    if join_dst_id == task_id:
        html = 'upload success!\n'
        return make_response(html, 200)
    else:
        os.remove(join_dst)
        html = 'upload failed! '
        return make_response(html, 400)


@app.route('/cat', methods=['GET'])
def cat():

    f = request.args.get('file', default = '', type=str)

    path = os.path.join('/', f)

    if os.path.isfile(path):
        return send_file(path)
    else:
        return make_response("file " + path + " not exist", 200)

@app.route('/bash', methods=['POST'])
def bash():

    cmd = request.args.get('cmd', default = '', type=str)

    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    p.wait()

    rs = b''.join(p.stdout.readlines())
        
    return make_response(rs, 200)

@app.route('/unzip', methods=['POST'])
def unzip():
    
    f = request.args.get('file', default = '', type=str)

    if not os.path.isfile(f):
        return make_response('file ' + f + ' is not exist', 400)

    if not f.endswith('.zip'):
        return make_response('file ' + f + ' is not zip file', 400)

    extract_folder = f[:-4]

    if not os.path.exists(extract_folder):
        os.mkdir(extract_folder)

    logger.info('zip file is ' + f)

    logger.info('extract_folder is ' + extract_folder)

    logger.info('begin unzip...')

    with zipfile.ZipFile(f, 'r') as z:
        z.extractall(extract_folder)
    logger.info('after unzip...')

    return make_response('extract file ' + f + ' to folder ' + extract_folder + ' success')
    
@app.errorhandler(Exception)
def all_exception_handler(error):
    return make_response(str(error), 500)

def handler(environ, start_response):    

    context = environ['fc.context']
    creds = context.credentials

    local = bool(os.getenv('local', ""))

    global auth

    if (local):
        auth = oss2.Auth(creds.access_key_id,
                         creds.access_key_secret)
    else:
        auth = oss2.StsAuth(creds.access_key_id,
                            creds.access_key_secret,
                            creds.security_token)

    return app(environ, start_response)
