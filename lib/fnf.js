'use strict';

const _ = require('lodash');
const YAML = require('js-yaml');

const transformFunctionInDefinition = (definition = {}, tpl = {}) => {
  const prefixMap = {};
  const generatePrefix = (prefix, key) => prefix ? `${prefix}.${key}` : key;

  const refFuncConverter = (value) => {
    if (!_.isString(value)) {
      throw new Error('Value of !Ref should be string');
    }
    const resourcePath = value.split('/');
    const resources = tpl.Resources || {};
    if (!_.has(resources, resourcePath)) {
      throw new Error(`Did not find resource '${value}'`);
    }
    const resource = _.get(resources, resourcePath);
    const resourceType = resource.Type || '';
    if (resourcePath.length === 1) {
      if (resourceType === 'Aliyun::Serverless::Service') {
        return `acs:fc:::services/${resourcePath[0]}`;
      }
    }
    if (resourcePath.length === 2) {
      if (resourceType === 'Aliyun::Serverless::Function') {
        return `acs:fc:::services/${resourcePath[0]}/functions/${resourcePath[1]}`;
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
  return YAML.dump(definition);
};

module.exports = {
  transformFunctionInDefinition
};