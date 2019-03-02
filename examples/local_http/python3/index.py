import sys
import json

def handler(environ, start_response):

    request_uri = environ['fc.request_uri']

    headers = {}
    for k, v in environ.items():
        if k.startswith("HTTP_"):
            # process custom request headers
            headers[k] = v
            pass

    # get request_body
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    request_body = environ['wsgi.input'].read(request_body_size)

    # get request_method
    request_method = environ['REQUEST_METHOD']

    # get path info
    path_info = environ['PATH_INFO']

    # get query_string
    try:
        query_string = environ['QUERY_STRING']    
    except (KeyError):
        query_string = ""

    response = {
        'headers': headers,
        'query_string': query_string,
        'method': request_method,
        'request_uri': request_uri,
        'path_info': path_info,
        'body': request_body.decode("utf-8"),
        'content_type': environ.get('CONTENT_TYPE', '')
    }

    sys.stdout.flush()

    status = '200 OK'
    response_headers = [('Content-type', 'application/json')]
    start_response(status, response_headers)

    # return value must be iterable
    return [json.dumps(response).encode()]