'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');

const exists = util.promisify(fs.exists);

async function detectTplPath() {
  return ['template.yml', 'template.yaml', 'faas.yml', 'faas.yaml']
    .map((f) => path.join(process.cwd(), f))
    .find(async (p) => (await exists(p)));
}

async function deploy(stage, tplPath) {

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    console.log('Current folder not a fun project');
    console.log('The folder must contains template.[yml|yaml] or faas.[yml|yaml] .');
    process.exit(-1);
  } else if (path.basename(tplPath).startsWith('template')) {
    await require('../deploy/deploy-by-tpl')(tplPath);
  } else if (path.basename(tplPath).startsWith('faas')) {
    await require('../deploy/deploy-by-faas')(stage);
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }

}

module.exports = deploy;
