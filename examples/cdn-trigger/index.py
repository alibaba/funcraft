# -*- coding: utf-8 -*-
import logging

def handler(event, context):
  logger = logging.getLogger()
  logger.info('cdn trigger event = %s', event)
  return 'hello world'