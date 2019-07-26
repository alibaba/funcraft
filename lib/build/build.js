'use strict';

const path = require('path');
const debug = require('debug')('fun:build');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const fcBuilders = require('@alicloud/fc-builders');
const _ = require('lodash');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const { green } = require('colors');
const taskflow = require('./taskflow');
const { showBuildNextTips } = require('./tips');
const template = require('./template');
const artifact = require('./artifact');

const builder = require('./builder');

async function buildFunction(buildName, tpl, tplPath, useContaienr, verbose) {
  if (useContaienr) {
    console.log(green('start building functions using docker'));
  } else {  
    console.log(green('start building functions without docker'));
  }

  debug(`buildName: ${buildName}`);

  const buildFuncs = template.findBuildFuncs(buildName, tpl);
  const skippedBuildFuncs = [];

  const baseDir = path.dirname(path.resolve(tplPath));
  const rootArtifactsDir = await artifact.generateRootArtifactDirectory(baseDir);

  await artifact.cleanDirectory(rootArtifactsDir);

  for (let func of buildFuncs) {
    const functionName = func.functionName;
    const serviceName = func.serviceName;
    const serviceRes = func.serviceRes;
    const functionRes = func.functionRes;

    console.log();
    console.log(green(`building ${serviceName}/${functionName}`));

    const runtime = functionRes.Properties.Runtime;
    const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);

    if (!(await fs.pathExists(codeUri))) {
      throw new Error(`CodeUri ${codeUri} is not exist.`);
    }

    const Builder = fcBuilders.Builder;
    const taskFlows = await Builder.detectTaskFlow(runtime, codeUri);

    if (_.isEmpty(taskFlows)) {
      console.log(`could not find any manifest file for ${func.serviceName}/${func.functionName}, building will be skipped`);
      skippedBuildFuncs.push(func);
      continue;
    } else if ( taskflow.isOnlyFunYmlTaskFlow(taskFlows)) {
      skippedBuildFuncs.push(func);
    }

    const funcArtifactDir = await artifact.generateArtifactDirectory(rootArtifactsDir, serviceName, functionName);

    await artifact.cleanDirectory(funcArtifactDir);

    const forceContainer = taskflow.needBuildUsingContainer(taskFlows, useContaienr);

    if (useContaienr || forceContainer) {
      await builder.buildInContainer(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose);
    } else {
      await builder.buildInProcess(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose);
    }
  }

  const updatedTemplateContent = template.updateTemplateResources(tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
  
  await writeFile(path.join(rootArtifactsDir, 'template.yml'), yaml.dump(updatedTemplateContent));

  console.log(green('\nBuild Success\n'));

  console.log('Built artifacts: ' + path.relative(baseDir, rootArtifactsDir));

  console.log('Built template: ' + path.relative(baseDir, path.join(rootArtifactsDir, 'template.yml')));

  showBuildNextTips();
}

module.exports = {
  buildFunction
};