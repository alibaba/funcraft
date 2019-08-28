'use strict';

const path = require('path');
const debug = require('debug')('fun:build');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const fcBuilders = require('@alicloud/fc-builders');
const _ = require('lodash');
const { green } = require('colors');
const taskflow = require('./taskflow');
const { showBuildNextTips } = require('./tips');
const template = require('./template');
const artifact = require('./artifact');
const docker = require('../docker');
const uuid = require('uuid');
const parser = require('./parser');
const { yellow } = require('colors');
const builder = require('./builder');
const ncp = require('ncp');
const nas = require('../nas');
const util = require('util');
const ncpAsync = util.promisify(ncp);

async function convertFunYmlToFunfile(funymlPath, funfilePath) {
  const generatedFunfile = await parser.funymlToFunfile(funymlPath);

  await fs.writeFile(funfilePath, generatedFunfile);
}

async function convertFunfileToDockerfile(funfilePath, dockerfilePath) {
  const dockerfileContent = await parser.funfileToDockerfile(funfilePath);

  await fs.writeFile(dockerfilePath, dockerfileContent);
}

async function assertCodeUriExist(codeUri) {
  if (!(await fs.pathExists(codeUri))) {
    throw new Error(`CodeUri ${codeUri} is not exist.`);
  }
}

async function copyNasArtifact(serviceName, serviceRes, imageTag, rootArtifactsDir, funcArtifactDir) {
  // if .fun/nas exist in funcArtifactDir , fun will move co rootartifactsDir
  const funcNasFolder = path.join(funcArtifactDir, '.fun', 'nas');
  const rootNasFolder = path.join(rootArtifactsDir, '.fun', 'nas');

  if (await fs.pathExists(funcNasFolder)) {
    console.log(`moving ${funcNasFolder} to ${rootNasFolder}`);

    await fs.ensureDir(rootNasFolder);

    await ncpAsync(funcNasFolder, rootNasFolder);
    await fs.remove(funcNasFolder);
  }

  // copy nas dir to rootArtifactsDir
  const nasConfig = (serviceRes.Properties || {}).NasConfig;

  if (nasConfig) {

    const nasMappings = await nas.convertNasConfigToNasMappings(rootArtifactsDir, nasConfig, serviceName);

    for (let nasMapping of nasMappings) {
      const localNasDir = nasMapping.localNasDir;
      let remoteNasDir = nasMapping.remoteNasDir;

      if (!remoteNasDir.endsWith('/')) {
        remoteNasDir += '/';
      }

      try {
        console.log('copy from container ' + remoteNasDir + '.' + ' to localNasDir');
        await docker.copyFromImage(imageTag, remoteNasDir + '.', localNasDir);
      } catch (e) {
        debug(`copy from image ${imageTag} directory ${remoteNasDir} to ${localNasDir} error`, e);
      }
    } 
  }
}

async function buildFunction(buildName, tpl, baseDir, useDocker, verbose) {
  if (useDocker) {
    console.log(green('start building functions using docker'));
  } else {
    console.log(green('start building functions without docker'));
  }

  debug(`buildName: ${buildName}`);

  const buildFuncs = template.findBuildFuncs(buildName, tpl);

  const skippedBuildFuncs = [];

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

    const funfilePath = path.join(codeUri, 'Funfile');
    const funymlPath = path.join(codeUri, 'fun.yml');

    let imageTag;

    let funfileExist = await fs.pathExists(funfilePath);
    const funymlExist = await fs.pathExists(funymlPath);

    const forceDocker = funymlExist || funfileExist;

    // convert funyml to Funfile if funyml exist and Funfile dont exist
    if (!funfileExist && funymlExist) {
      console.log('detecting fun.yml but no Funfile, Fun will convert fun.yml to Funfile');

      await convertFunYmlToFunfile(funymlPath, funfilePath);

      funfileExist = true;
    }

    // convert Funfile to dockerfile if Funfile exist
    if (funfileExist) {
      console.log(yellow('Funfile exist, Fun will use container to build forcely'));

      const dockerfilePath = path.join(codeUri, '.Funfile.generated.dockerfile');

      await convertFunfileToDockerfile(funfilePath, dockerfilePath);

      const tag = `fun-build-cache-${uuid.v4()}`;

      imageTag = await docker.buildImage(codeUri, dockerfilePath, tag);

      // copy fun install generated artifact files to artifact dir
      console.log(`copying function build artifact to ${funcArtifactDir}`);
      await docker.copyFromImage(imageTag, '/code/.', funcArtifactDir);

      // process nas folder
      await copyNasArtifact(serviceName, serviceRes, imageTag, rootArtifactsDir, funcArtifactDir);
    }

    // if no manifest file and no Funfile, dont need compile function
    if (!funfileExist && (_.isEmpty(taskFlows) || taskflow.isOnlyDefaultTaskFlow(taskFlows))) {
      console.log(`could not find any manifest file for ${func.serviceName}/${func.functionName}, building will be skipped`);
      skippedBuildFuncs.push(func);
      continue;
    }

    if (useDocker || forceDocker) {
      await builder.buildInDocker(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, imageTag);
    } else {
      await builder.buildInProcess(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose);
    }
  }

  const updatedTemplateContent = template.updateTemplateResources(tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);

  await fs.writeFile(path.join(rootArtifactsDir, 'template.yml'), yaml.dump(updatedTemplateContent));

  console.log(green('\nBuild Success\n'));

  console.log('Built artifacts: ' + path.relative(baseDir, rootArtifactsDir));

  console.log('Built template: ' + path.relative(baseDir, path.join(rootArtifactsDir, 'template.yml')));

  showBuildNextTips();
}

module.exports = {
  buildFunction, copyNasArtifact
};