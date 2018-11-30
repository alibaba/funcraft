import logging
import json
import urllib
import re
import oss2
import os
import datetime

logger = logging.getLogger()

endpoint = os.environ['OSSEndpoint']
bucket_name = os.environ['BucketName']

reg = r'http:\/\/[^\s,"]*\.jpg'
imgre = re.compile(reg)

local = bool(os.getenv('local', ""))

def get_img(html):
    return re.findall(imgre, html)

def handler(event, context):
    
    logger.info("event: " + event)
    evt = json.loads(event)
    url = evt['url']
  
    html = get_html(url)
  
    img_list = get_img(html)
    logger.info(img_list)

    creds = context.credentials

    if (local):
        auth = oss2.Auth(creds.access_key_id,
                         creds.access_key_secret)
    else:
        auth = oss2.StsAuth(creds.access_key_id,
                            creds.access_key_secret,
                            creds.security_token)
                            
    bucket = oss2.Bucket(auth, endpoint, bucket_name)

    count = 0
    for item in img_list:
        count += 1
        logging.info(item)
        # Get each picture
        pic = urllib.urlopen(item)
        # Store all the pictures in oss bucket, keyed by timestamp in microsecond unit
        bucket.put_object(str(datetime.datetime.now().microsecond) + '.png', pic)
  
    return 'Done!'

def get_html(url):
    page = urllib.urlopen(url)
    html = page.read()
    return html