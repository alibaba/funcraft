'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const exists = util.promisify(fs.exists);

const _validate = require('../validate/validate');

async function validate(tplPath) {
  if (tplPath === undefined || tplPath === 'template.[yaml|yml]') {
    tplPath = 'template.yaml';
    if (await exists('template.yml')) {
      tplPath = 'template.yml';
    }
  }

  let absTplPath = path.resolve(tplPath);
  if (!(await exists(tplPath))) {
    console.error(`Can't find template file at ${absTplPath}.`);
    return;
  }

  await _validate(absTplPath);
}

module.exports = validate;