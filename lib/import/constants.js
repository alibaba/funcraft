'use strict';

const TEMPLATE_HEADER = {
  ROSTemplateFormatVersion: '2015-09-01',
  Transform: 'Aliyun::Serverless-2018-04-03',
  Resources: {}
};

const SERVICE_TYPE = 'Aliyun::Serverless::Service';
const CUSTOM_DOMAIN_TYPE = 'Aliyun::Serverless::CustomDomain';
const FUNCTION_TYPE = 'Aliyun::Serverless::Function';


module.exports = {
  TEMPLATE_HEADER, SERVICE_TYPE, CUSTOM_DOMAIN_TYPE, FUNCTION_TYPE
};
