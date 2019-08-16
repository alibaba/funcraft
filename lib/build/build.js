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
const docker = require('../docker');
const uuid = require('uuid');
const { funymlToFunfile, funfileToDockerfile } = require('./parser');

const builder = require('./builder');

async function convertFunYmlToFunfile(funymlPath, funfilePath) {
  const generatedFunfile = await funymlToFunfile(funymlPath);

  await fs.writeFile(funfilePath, generatedFunfile);
}

async function convertFunfileToDockerfile(funfilePath, dockerfilePath) {
  const dockerfileContent = await funfileToDockerfile(funfilePath);

  await fs.writeFile(dockerfilePath, dockerfileContent);
}

async function assertCodeUriExist(codeUri) {
  if (!(await fs.pathExists(codeUri))) {
    throw new Error(`CodeUri ${codeUri} is not exist.`);
  }
}

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
    const { functionName, serviceName, serviceRes, functionRes } = func;

    console.log();
    console.log(green(`building ${serviceName}/${functionName}`));

    const runtime = functionRes.Properties.Runtime;
    const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);

    await assertCodeUriExist(codeUri);

    const funcArtifactDir = await artifact.generateArtifactDirectory(rootArtifactsDir, serviceName, functionName);

    await artifact.cleanDirectory(funcArtifactDir);

    const Builder = fcBuilders.Builder;
    const taskFlows = await Builder.detectTaskFlow(runtime, codeUri);

    let forceContainer = taskflow.needBuildUsingContainer(taskFlows, useContaienr);

    const funfilePath = path.join(codeUri, 'funfile');
    const funymlPath = path.join(codeUri, 'fun.yml');

    let imageTag;

    let funfileExist = await fs.pathExists(funfilePath);
    const funymlExist = await fs.pathExists(funymlPath);

    // convert funyml to funfile if funyml exist and funfile dont exist
    if (!funfileExist && funymlExist) { 
      console.log("detecting fun.yml and but no funfile, Fun will convert fun.yml to funfile"); 
      
      await convertFunYmlToFunfile(funymlPath, funfilePath);
   
      funfileExist = true;
    }

    // convert funfile to dockerfile if funfile exist
    if (funfileExist) { 
      const dockerfilePath = path.join(codeUri, '.funfile.generated.dockerfile');
  
      await convertFunfileToDockerfile(funfilePath, dockerfilePath);

      const tag = `fun-build-cache-${uuid.v4()}`;
    
      imageTag = await docker.buildImage(codeUri, dockerfilePath, tag);
   
      // copy fun install generated artifact files to artifact dir
      await docker.copyFromImage(imageTag, '/code/.', funcArtifactDir);

      forceContainer = true;
    }

    // if no manifest file, dont need compile function
    if (_.isEmpty(taskFlows)) {
      console.log(`could not find any manifest file for ${func.serviceName}/${func.functionName}, building will be skipped`);
      skippedBuildFuncs.push(func);
      continue;
    } else if (taskflow.isOnlyFunYmlTaskFlow(taskFlows)) {
      skippedBuildFuncs.push(func);
    }

    if (useContaienr || forceContainer) {
      await builder.buildInContainer(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, imageTag);
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
  buildFunction, funymlToFunfile
};