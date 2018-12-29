import logging
import os
import json

def handler(environ, start_response):
  logger = logging.getLogger()

  root_dir = os.environ['ROOT_DIR']

  logger.info('uid : ' + str(os.geteuid()))
  logger.info('gid : ' + str(os.getgid()))

  file_name = 'test_http.txt'
  content = "NAS here I come with http trigger"

  print(os.system("ls -ll /mnt/test"))
  print(os.system("id"))

  fw = open(root_dir + '/' + file_name, "w+")
  fw.write(content)
  fw.close()
  
  print(os.system("ls -ll /mnt/test"))
  
  res = '{{ "file": "{0}", "contents": "{1}", "message": "write success" }}'.format(file_name, content)
  
  response_headers = [('Content-type', 'application/json')]

  status = '200 OK'

  start_response(status, response_headers)

  return [bytes(res, 'utf-8')]
