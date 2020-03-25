'use strict';

const fs = require('fs-extra');
const path = require('path');

const _validate = require('../validate/validate');

async function validate(tplPath) {
  if (tplPath === undefined || tplPath === 'template.[yaml|yml]') {
    tplPath = 'template.yaml';
    if (await fs.pathExists('template.yml')) {
      tplPath = 'template.yml';
    }
  }

  let absTplPath = path.resolve(tplPath);
  if (!(await fs.pathExists(tplPath))) {
    console.error(`Can't find template file at ${absTplPath}.`);
    return;
  }

  await _validate(absTplPath);
}

module.exports = validate;