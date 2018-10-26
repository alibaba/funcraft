# -*- coding: utf-8 -*-
import logging
import json
from aliyun.log import LogClient
from time import time

def logClient(endpoint):
  accessKeyId = 'your accessKeyId'
  accessKey = 'your accessKeyId scr'
  client = LogClient(endpoint, accessKeyId, accessKey)
  return client

def handler(event, context):
  logger = logging.getLogger()
  creds = context.credentials
  logger.info('hello world')
  logger.info('jiangweiqi')
  logger.info(event.decode().encode())
  info_arr = json.loads(event.decode())
  fetchdata(info_arr['source'], creds)
  return 'hello world'

def fetchdata(event, creds):
  #event = {'beginCursor':'MTUyOTQ4MDIwOTY1NTk3ODQ2Mw==', 'endCursor':'MTUyOTQ4MDIwOTY1NTk3ODQ2NA==', 'shardId':0, 'projectName':'log-com', 'logstoreName':'log-en', 'endpoint':'cn-shanghai.log.aliyuncs.com', 'projectName':'log-com', 'logstoreName':'log-en'}
  logger = logging.getLogger()
  logger.info("=================")
  logger.info(creds.access_key_id)
  logger.info(creds.access_key_secret)
  logger.info(creds.security_token)
  endpoint = event['endpoint']
  client = logClient(endpoint)
  if client == None :
      logger.info("client creat failed")
      return False
  project = event['projectName']
  logstore = event['logstoreName']
  start_cursor = event['beginCursor']
  end_cursor = event['endCursor']
  loggroup_count = 10
  shard_id = event['shardId']
  while True:
      res = client.pull_logs(project, logstore, shard_id, start_cursor, loggroup_count, end_cursor)
      res.log_print()
      next_cursor = res.get_next_cursor()
      if next_cursor == start_cursor :
          break
      start_cursor = next_cursor

    #log_data =  res.get_loggroup_json_list()
  return True
