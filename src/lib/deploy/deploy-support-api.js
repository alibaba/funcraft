'use strict';

const _ = require('lodash');

// generate service parameter using request parameter
// https://help.aliyun.com/document_detail/43988.html
function generateServiceParameter(serviceParameterName, requestParameter) {
  return {
    serviceParameterName: serviceParameterName,
    location: requestParameter.location,
    parameterType: requestParameter.parameterType,
    parameterCatalog: 'REQUEST'
  };
}

// generate service ServiceParameterMap
// https://help.aliyun.com/document_detail/43989.html
function generateServiceParameterMap(requestParameterName, serviceParameterName) {
  return {
    serviceParameterName: serviceParameterName,
    requestParameterName: requestParameterName
  };
}

function getDefaultRequestParameter() {
  return {
    'location': 'QUERY',
    'parameterType': 'String',
    'required': 'OPTIONAL'
  };
}

function assertArray(arg, errorMessage) {
  if (arg !== null && arg !== undefined && !Array.isArray(arg)) {
    throw new Error(errorMessage);
  }
}

function processApiParameters(requestParameters = [], serviceParameters = [], serviceParametersMap = []) {

  assertArray(requestParameters, 'requestParameters must be array');
  assertArray(serviceParameters, 'serviceParameters must be array');
  assertArray(serviceParametersMap, 'serviceParametersMap must be array');

  // 1. 初始化
  const apiRequestParameters = requestParameters.map((item) => {
    return Object.assign(getDefaultRequestParameter(), item);
  });

  // 下面的处理保证用户填写的配置不会被修改，但会尽可能推测未配置项
  const apiServiceParameters = (serviceParameters || []).slice(0);
  const apiServiceParametersMap = (serviceParametersMap || []).slice(0);

  // 2. 如果配置了 requestParameters，则遍历所有 reqeustParameter
  apiRequestParameters.forEach(requestParameter => {
    const serviceParameterMap = _.find(serviceParametersMap, { 'requestParameterName': requestParameter.apiParameterName });
    if (serviceParameterMap) {
      // 2.1 如果在 serviceParametersMap 中存在该 reqeustParameter，则使用 ServiceParameterName 检查 serviceParameters 是否存在
      const serviceParameter = _.find(serviceParameters, { 'serviceParameterName': serviceParameterMap.serviceParameterName });
      // 2.1.1 如果存在，则忽略
      // 2.1.2 如果不存在，则自动生成配置，且 ServiceParameterName 配置为 serviceParametersMap 的值
      if (!serviceParameter) {
        const apiServieParameter = generateServiceParameter(serviceParameterMap.serviceParameterName, requestParameter);
        apiServiceParameters.push(apiServieParameter);
      }
    } else {
      // 2.2 如果在 serviceParametersMap 中不存在 reqeustParameter，则检查 reqeustParameter 的 apiParameterName 是否在 serviceParameters 中存在：
      const serviceParameter = _.find(serviceParameters, { 'serviceParameterName': requestParameter.apiParameterName });
      if (serviceParameter) {
        // 2.2.1 如果存在，则忽略，但会配置 serviceParametersMap
        const serviceParameterMap = generateServiceParameterMap(requestParameter.apiParameterName, requestParameter.apiParameterName);
        apiServiceParametersMap.push(serviceParameterMap);
      } else {
        // 2.2.2 如果不存在，则自动创建，且 ServiceParameterName 配置为 apiParameterName，且配置 serviceParametersMap
        const apiServieParameter = generateServiceParameter(requestParameter.apiParameterName, requestParameter);
        apiServiceParameters.push(apiServieParameter);

        const serviceParameterMap = generateServiceParameterMap(requestParameter.apiParameterName, requestParameter.apiParameterName);
        apiServiceParametersMap.push(serviceParameterMap);
      }
    }
  });

  return {
    apiRequestParameters,
    apiServiceParameters,
    apiServiceParametersMap
  };
}

module.exports = { processApiParameters };