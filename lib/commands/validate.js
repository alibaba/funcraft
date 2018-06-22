'use strict';

const fs = require('fs');
const util = require('util');

const exists = util.promisify(fs.exists);

const _validate = require('../validate/validate');

async function validate(tplPath) {
  if(tplPath === undefined || tplPath === 'template.{yaml|yml}'){
    if(await exists('template.yml')){
      tplPath = 'template.yml';
    } else if(await exists('template.yaml')){
      tplPath = 'template.yaml';
    }
  }

  if (!(await exists(tplPath))) {
    console.error('Can\'t found template.yml in current dir.');
    return;
  }

  let {valid, ajv, tpl} = await _validate(tplPath);

  if (valid) {
    console.log(JSON.stringify(tpl, null, 2));
  } else {
    console.error(JSON.stringify(ajv.errors, null, 2));
  }
  return valid;
}

module.exports = validate;