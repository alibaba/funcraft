# -*- coding: utf-8 -*-

import json

def hello(event, context):
    res = {
        'isBase64Encoded': False,
        'statusCode': 200,
        'headers': {
            'content-type' : 'text/plain'
        },
        'body': 'Hello world!'
    }
    return json.dumps(res)
