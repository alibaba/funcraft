'use strict';

const rmNasFile = require('../../nas/rm');
const { convertTplToServiceNasIdMappings } = require('../../nas');
const { parseNasUri } = require('../../nas/path');
const { detectTplPath, getTpl } = require('../../tpl');
const { getDefaultService } = require('../../nas/support');
const path = require('path');
const validate = require('../../validate/validate');
const { red } = require('colors');

async function rm(nasDir, options) {

  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    await validate(tplPath);
    const tpl = await getTpl(tplPath);

    const isRecursive = options.recursive;
    const isForce = options.force;
    
    var { nasPath, serviceName } = await parseNasUri(nasDir); 
    
    if (serviceName === '') {
      serviceName = getDefaultService(tpl);
    }
    const serviceNasIdMappings = convertTplToServiceNasIdMappings(tpl);
    const nasId = serviceNasIdMappings[serviceName];
    
    await rmNasFile(serviceName, nasPath, isRecursive, isForce, nasId);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = rm;
