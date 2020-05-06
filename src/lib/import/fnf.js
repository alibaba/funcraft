'use strict';
const path = require('path');

const { green } = require('colors');
const { getFnFClient } = require('../client');
const { parsingFlowResource } = require('./fnf-parser');
const { getTemplateFile, outputTemplateFile, getTemplateHeader } = require('./utils');

const _ = require('lodash');

async function getFlowResource(fnfName) {
  const client = await getFnFClient();
  return await client.describeFlow({
    'Name': fnfName
  });
}

function getDefaultTemplate(absOutputDir) {
  const templateFile = getTemplateFile(absOutputDir);
  const templateFilePath = path.resolve(absOutputDir, 'template.yml');

  if (templateFile) {
    return {
      content: templateFile.content,
      templateFilePath
    };
  }

  return {
    content: getTemplateHeader(),
    templateFilePath
  };
}

function resolveOutputDir(cwd, outputDir) {
  if (!path.isAbsolute(outputDir)) {
    if (!cwd || cwd === '.') {
      cwd = process.cwd();
    }
    cwd = path.resolve(cwd);
    return path.resolve(cwd, outputDir);
  }
  return outputDir;
}

// not support overwrite
async function importFlowResource({
  fnfName,
  outputDir = '.',
  definitionYmlPrefix,
  skipIfExists = false
}) {
  if (!fnfName) {
    console.log('fnfName is missing.');
    return;
  }
  console.log('\nImport flow resources...');

  const rs = await getFlowResource(fnfName);

  const absOutputDir = resolveOutputDir(null, outputDir);

  const { content, templateFilePath } = getDefaultTemplate(absOutputDir);

  if (!_.isEmpty(content.Resources[fnfName])) {
    if (skipIfExists) {
      console.log(`Flow ${fnfName} is already exist, skip.`);
      return;
    }
    throw new Error(`Flow ${fnfName} is already exist.`);
  }

  const definitionYmlPath = path.join(absOutputDir, `${definitionYmlPrefix ? definitionYmlPrefix : fnfName}.flow.yml`);

  content.Resources[fnfName] = parsingFlowResource(rs, definitionYmlPath, outputDir);

  outputTemplateFile(templateFilePath, content);

  console.log(`${green('✔')} flow import finished`);
}

module.exports = importFlowResource;