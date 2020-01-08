'use strict';

const nas = require('../../nas');
const validate = require('../../validate/validate');

const { red } = require('colors');
const { getNasMappingsFromNasYml } = require('../../nas/support');
const { detectTplPath, getTpl, validateTplName, detectNasBaseDir, getNasYmlPath } = require('../../tpl');

const _ = require('lodash');


function mergeNasMappings(fromTpl, fromNasYml) {

  return _.mapValues(fromTpl, (nasMappings, serviceName) => {

    if (_.isEmpty(fromNasYml[serviceName])) {
      return nasMappings;
    }
    return _.unionWith([...fromNasYml[serviceName], ...nasMappings], _.isEqual);
  });
}

async function info(tplPath) {

  if (!tplPath) {
    tplPath = await detectTplPath(false);
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const nasBaseDir = detectNasBaseDir(tplPath);

  const nasMappingsFromTpl = await nas.convertTplToServiceNasMappings(nasBaseDir, tpl);
  const nasMappingsFromNasYml = await getNasMappingsFromNasYml(getNasYmlPath(tplPath));
  const serviceNasMappings = mergeNasMappings(nasMappingsFromTpl, nasMappingsFromNasYml);

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
}

module.exports = info;
