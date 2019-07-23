'use strict';

const { doProp } = require('./utils');
const { CUSTOM_DOMAIN_TYPE } = require('./constants');

function isCertConfigConfigNotEmpty(certConfig) {
  return !!(certConfig && certConfig.certName);
}

function parseCustomDomainResource(customDomainMeta) {
  const customDomainResource = {
    Type: CUSTOM_DOMAIN_TYPE,
    Properties: {}
  };
  const properties = customDomainResource.Properties;
  doProp(properties, 'Protocol', customDomainMeta.protocol);
  doProp(properties, 'RouteConfig', {
    Routes: {}
  });
  for (const route of customDomainMeta.routeConfig.routes) {
    properties.RouteConfig.Routes[route.path] = {
      ServiceName: route.serviceName,
      FunctionName: route.functionName
    };
  }
  const certConfig = customDomainMeta.certConfig;
  if (isCertConfigConfigNotEmpty(certConfig)) {
    doProp(properties, 'CertConfig', {
      CertName: certConfig.certName,
      PrivateKey: certConfig.privateKey,
      Certificate: certConfig.certificate
    });
  }

  return customDomainResource;
}

module.exports = {
  parseCustomDomainResource
};
