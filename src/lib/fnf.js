'use strict';

const _ = require('lodash');
const YAML = require('js-yaml');
const {
  validateParameters
} = require('./deploy/deploy-support-ros');
const {
  SERVICE_RESOURCE,
  iterateResources,
  iterateFunctions
} = require('./definition');

const transformFunctionInDefinition = (definition = {}, tpl = {}, parameterOverride = {}, useRos = false) => {
  if (!_.isEmpty(parameterOverride)) {
    validateParameters(tpl.Parameters, parameterOverride);
  }
  const prefixMap = {};
  const dependsOn = [];
  const generatePrefix = (prefix, key) => prefix ? `${prefix}.${key}` : key;

  const refFuncConverter = (value) => {
    if (!_.isString(value)) {
      throw new Error('Value of !Ref should be string');
    }
    const resourcePath = value.split('/');
    const resources = tpl.Resources || {};
    const parameters = tpl.Parameters || {};
    let isParam = false;
    if (!_.has(resources, resourcePath)) {
      if (resourcePath.length === 1 && !_.has(parameters, value)) {
        throw new Error(`Did not find resource or parameter '${value}'`);
      } else if (resourcePath.length !== 1) {
        throw new Error(`Did not find resource '${value}'`);
      } else {
        isParam = true;
      }
    }

    if (isParam) {
      if (useRos) {
        return `\${${value}}`;
      }
      if (parameterOverride[value]) {
        return parameterOverride[value];
      } else if (_.has(parameters, [value, 'Default'])) {
        return _.get(parameters, [value, 'Default']);
      }
      throw new Error(`Parameter '${value}' has not been set value`);
    }
    const resource = _.get(resources, resourcePath);
    const resourceType = resource.Type || '';
    if (resourcePath.length === 1) {
      if (resourceType === 'Aliyun::Serverless::Service') {
        dependsOn.push(resourcePath[0]);
        return useRos ? `\${${resourcePath[0]}.ARN}` : `acs:fc:::services/${resourcePath[0]}`;
      }
    }
    if (resourcePath.length === 2) {
      if (resourceType === 'Aliyun::Serverless::Function') {
        dependsOn.push(`${resourcePath[0]}${resourcePath[1]}`);
        return useRos ? `\${${resourcePath[0]}${resourcePath[1]}.ARN}`
          : `acs:fc:::services/${resourcePath[0]}/functions/${resourcePath[1]}`;
      }
    }
    throw new Error(`Can not convert resource '${value}' to arn`);
  };

  const getAttFuncConverter = (value) => {
    if (!_.isArray(value) || value.length !== 2) {
      throw new Error('Value of !GetAtt should be the following form: aaa/bbb/ccc.p1.p2');
    }
    const resourcePath = value[0].split('/');
    const resources = tpl.Resources || {};
    if (!_.has(resources, resourcePath)) {
      throw new Error(`Did not find resource '${value}'`);
    }
    const resource = _.get(resources, resourcePath);
    const resourceProperties = resource.Properties || {};

    if (useRos) {
      return `\${${resourcePath.join('')}.${value[1]}}`;
    }

    if (!_.has(resourceProperties, value[1])) {
      throw new Error(`Did not find '${value[0]}' resource's property '${value[1]}'`);
    }

    return _.get(resourceProperties, value[1]);
  };

  const functionConverters = {
    'Ref': refFuncConverter,
    'Fn::GetAtt': getAttFuncConverter
  }; 

  const iterateObject = (obj, prefix) => {
    _.forIn(obj, (value, key, obj) => {
      if (_.keys(functionConverters).includes(key)) {
        const convertedValue = functionConverters[key](value);
        const { obj: o, key: k } = prefixMap[prefix];
        o[k] = convertedValue;
        delete prefixMap[prefix];
      } else if (_.isObjectLike(value)) {
        if (_.keys(value).length === 1 && _.keys(functionConverters).includes(_.keys(value)[0])) {
          prefixMap[generatePrefix(prefix, key)] = {
            obj,
            key
          };
        }
        iterateObject(value, generatePrefix(prefix, key)); 
      }
    });
  };

  iterateObject(definition);
  return {
    definition: YAML.dump(definition),
    dependsOn: dependsOn
  };
};

const transformFlowDefinition = (definition, tpl = {}, parameterOverride = {}) => {
  if (_.isString(definition)) {
    return definition;
  }
  if (!_.isObject(definition) ||
    !_.has(definition, 'Fn::Sub') ||
    !_.isString(_.get(definition, 'Fn::Sub'))
  ) {
    throw new Error('The flow definition in this format can not be converted');
  }
  const resourceMap = generateResourceMap(tpl);
  const parameterMap = generateParameterMap(tpl, parameterOverride);
  const replaceMap = {};
  definition = _.get(definition, 'Fn::Sub');
  const regex = new RegExp(/\${(.*)}/g);
  let execRes;
  while ((execRes = regex.exec(definition))) {
    const indexKey = execRes[1];
    if (indexKey.split('.').length > 1) {
      const [first, ...tail] = indexKey.split('.');
      replaceMap[execRes[0]] = _.get(resourceMap[first], tail.join('.'), 'NONE');
    } else {
      replaceMap[execRes[0]] = parameterMap[indexKey] || 'NONE';
    }
  }

  for (const [src, target] of Object.entries(replaceMap)) {
    definition = definition.split(src).join(target);
  }
  return definition;
};

const generateResourceMap = (tpl = {}) => {
  const resourceMap = new Map();

  iterateResources(tpl.Resources, SERVICE_RESOURCE, (name, res) => {
    const properties = res.Properties || {};
    properties.ARN = `acs:fc:::services/${name}`;
    properties.ServiceName = name;
    resourceMap[name] = properties;
  });
  
  iterateFunctions(tpl, (
    serviceName,
    serviceRes,
    functionName,
    functionRes
  ) => {
    const properties = functionRes.Properties || {};
    properties.ARN = `acs:fc:::services/${serviceName}/functions/${functionName}`;
    properties.ServiceName = serviceName;
    properties.FunctionName = functionName;
    resourceMap[`${serviceName}${functionName}`] = properties;
  });

  return resourceMap;
};

const generateParameterMap = (tpl = {}, parameterOverride = {}) => {
  const parameterMap = new Map();
  const parameters = tpl.Parameters || {};
  for (const [name, def] of Object.entries(parameters)) {
    if (parameterOverride[name]) {
      parameterMap[name] = parameterOverride[name];
    } else if (def.Default) {
      parameterMap[name] = def.Default;
    }
  }
  return parameterMap;
};

module.exports = {
  transformFunctionInDefinition,
  transformFlowDefinition
};