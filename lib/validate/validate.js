'use strict';

const _ = require('lodash');

const Ajv = require('ajv');

const schemas = require('./schema');

const keyWordArray = ['oneOf', 'if', 'anyOf', 'false schema'];

const colorize = require('json-colorizer');
const { mergeTpl } = require('../utils/tpl');

async function validate(...tplPaths) {
  // work around: https://github.com/alibaba/funcraft/issues/676
  if (process.env.IGNORE_TPL_VALIDATION
    && process.env.IGNORE_TPL_VALIDATION !== '0'
    && process.env.IGNORE_TPL_VALIDATION !== 'false'
  ) {
    return;
  }
  const tpl = mergeTpl(...tplPaths);

  const ajv = new Ajv({ schemas, allErrors: true, jsonPointers: true });
  ajv.validate('/ROS', tpl);

  let errors;
  if (ajv.errors) {
    errors = ajv.errors.filter(p => !_.includes(keyWordArray, p.keyword)).map(m => _.omit(m, ['schemaPath', 'emUsed']));

    throw new Error(colorize(JSON.stringify(errors, null, 2), {
      colors: {
        STRING_KEY: 'whilte',
        STRING_LITERAL: 'green',
        NUMBER_LITERAL: '#FF0000'
      }
    }));
  }
}

module.exports = validate;