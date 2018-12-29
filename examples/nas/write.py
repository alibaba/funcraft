import logging
import os

def handler(event, context):
  logger = logging.getLogger()

  root_dir = os.environ['ROOT_DIR']

  logger.info('uid : ' + str(os.geteuid()))
  logger.info('gid : ' + str(os.getgid()))

  file_name = 'test.txt'
  content = "NAS here I come"

  print(os.system("ls -ll /mnt/test"))
  print(os.system("id"))

  fw = open(root_dir + '/' + file_name, "w+")
  fw.write(content)
  fw.close()
  
  print(os.system("ls -ll /mnt/test"))

  return 'write success'
