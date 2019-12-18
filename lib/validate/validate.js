'use strict';

const fs = require('fs');
const util = require('util');

const yaml = require('js-yaml');
const _ = require('lodash');

const Ajv = require('ajv');
const readFile = util.promisify(fs.readFile);

const schemas = require('./schema');

const keyWordArray = ['oneOf', 'if', 'anyOf', 'false schema'];

const colorize = require('json-colorizer');

async function validate(tplPath) {
  // work around: https://github.com/alibaba/funcraft/issues/676
  if (process.env.IGNORE_TPL_VALIDATION
    && process.env.IGNORE_TPL_VALIDATION !== '0'
    && process.env.IGNORE_TPL_VALIDATION !== 'false'
  ) {
    return;
  }
  const tplContent = await readFile(tplPath, 'utf8');
  const tpl = yaml.safeLoad(tplContent);

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