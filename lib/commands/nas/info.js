'use strict';

const path = require('path');
const { detectTplPath, getTpl } = require('../../tpl');
const { red } = require('colors');
const validate = require('../../validate/validate');

const nas = require('../../nas');
const _ = require('lodash');

async function info(tplPath) {

  if (!tplPath) {
    tplPath = await detectTplPath(false);
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const baseDir = path.dirname(tplPath);

    const serviceNasMappings = await nas.convertTplToServiceNasMappings(baseDir, tpl);
    
    _.forEach(serviceNasMappings, (nasMappings, serviceName) => {
      console.log();
      console.log('Local NAS folder of service ' + serviceName + ' includes:');

      if (_.isEmpty(nasMappings)) { console.log('None'); }
      else {
        for ( let { localNasDir } of nasMappings) {
          console.log(localNasDir);
        }
      }
    });
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }
}

module.exports = info;
