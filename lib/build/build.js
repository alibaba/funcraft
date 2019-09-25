'use strict';

const path = require('path');
const debug = require('debug')('fun:build');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const fcBuilders = require('@alicloud/fc-builders');
const _ = require('lodash');
const { green } = require('colors');
const taskflow = require('./taskflow');
const { showBuildNextTips, showInstallNextTips } = require('./tips');
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

async function copyNasArtifact(nasMappings, imageTag, rootArtifactsDir, funcArtifactDir) {
  // if .fun/nas exist in funcArtifactDir , fun will move co rootartifactsDir
  const funcNasFolder = path.join(funcArtifactDir, '.fun', 'nas');
  const rootNasFolder = path.join(rootArtifactsDir, '.fun', 'nas');

  if (await fs.pathExists(funcNasFolder) && funcNasFolder !== rootNasFolder) {
    console.log(`moving ${funcNasFolder} to ${rootNasFolder}`);

    await fs.ensureDir(rootNasFolder);

    await ncpAsync(funcNasFolder, rootNasFolder);
    await fs.remove(funcNasFolder);
  }

  if (nasMappings) {
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

async function getOrConvertFunfile(codeUri) {
  const funfilePath = path.join(codeUri, 'Funfile');
  const funymlPath = path.join(codeUri, 'fun.yml');

  let funfileExist = await fs.pathExists(funfilePath);
  const funymlExist = await fs.pathExists(funymlPath);

  // convert funyml to Funfile if funyml exist and Funfile dont exist
  if (!funfileExist && funymlExist) {
    console.log('detecting fun.yml but no Funfile, Fun will convert fun.yml to Funfile');

    await convertFunYmlToFunfile(funymlPath, funfilePath);

    funfileExist = true;
  }

  if (funfileExist) {
    return funfilePath;
  }
  return null;
}

async function processFunfile(serviceName, serviceRes, codeUri, funfilePath, rootArtifactsDir, funcArtifactDir) {
  console.log(yellow('Funfile exist, Fun will use container to build forcely'));

  const dockerfilePath = path.join(codeUri, '.Funfile.generated.dockerfile');

  await convertFunfileToDockerfile(funfilePath, dockerfilePath);

  const nasConfig = (serviceRes.Properties || {}).NasConfig;

  let nasMappings;

  if (nasConfig) {
    nasMappings = await nas.convertNasConfigToNasMappings(rootArtifactsDir, nasConfig, serviceName);
  }

  const tag = `fun-cache-${uuid.v4()}`;

  const imageTag = await docker.buildImage(codeUri, dockerfilePath, tag);

  // copy fun install generated artifact files to artifact dir
  console.log(`copying function artifact to ${funcArtifactDir}`);
  await docker.copyFromImage(imageTag, '/code/.', funcArtifactDir);

  // process nas folder
  await copyNasArtifact(nasMappings, imageTag, rootArtifactsDir, funcArtifactDir);

  await fs.remove(dockerfilePath);

  return imageTag;
}

async function buildFunction(buildName, tpl, baseDir, useDocker, stages, verbose) {
  const buildStage = _.includes(stages, 'build');

  if (useDocker) {
    console.log(green(`start ${buildStage ? 'building' : 'installing'} functions using docker`));
  } else {
    console.log(green(`start ${buildStage ? 'building' : 'installing'} function dependencies without docker`));
  }

  debug(`${buildStage ? 'buildName' : 'installName'}: ${buildName}`);

  const buildFuncs = template.findBuildFuncs(buildName, tpl);

  const skippedBuildFuncs = [];

  let rootArtifactsDir;
  if (buildStage) {
    rootArtifactsDir = await artifact.generateRootArtifactDirectory(baseDir);
    await artifact.cleanDirectory(rootArtifactsDir);
  } else {
    rootArtifactsDir = baseDir;
  }

  for (let func of buildFuncs) {
    const { functionName, serviceName, serviceRes, functionRes } = func;

    console.log();
    console.log(green(`building ${serviceName}/${functionName}`));

    const runtime = functionRes.Properties.Runtime;
    const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);

    await assertCodeUriExist(codeUri);

    let funcArtifactDir;
    if (buildStage) {
      funcArtifactDir = await artifact.generateArtifactDirectory(rootArtifactsDir, serviceName, functionName);
      await artifact.cleanDirectory(funcArtifactDir);
    } else {
      funcArtifactDir = codeUri;
    }

    const Builder = fcBuilders.Builder;
    const taskFlows = await Builder.detectTaskFlow(runtime, codeUri);

    const funfilePath = await getOrConvertFunfile(codeUri);

    if (!funfilePath) {
      
      throw new Error('\nplease make sure the file "Funfile" is in the CodeUri.');
    }

    // convert Funfile to dockerfile if Funfile exist
    const imageTag = await processFunfile(serviceName, serviceRes, codeUri, funfilePath, rootArtifactsDir, funcArtifactDir);

    // For build stage, Fun needn't compile functions only if there are no manifest file and no Funfile.
    // For install stage, Fun needn't compile functions only if there are no manifest file.
    const manifestExist = !(_.isEmpty(taskFlows) || taskflow.isOnlyDefaultTaskFlow(taskFlows));

    if ((buildStage && (!funfilePath && !manifestExist))
      || (!buildStage && !manifestExist)) {
      debug(`could not find any manifest file for ${func.serviceName}/${func.functionName}, [${stages}] stage for manifest will be skipped`);
      skippedBuildFuncs.push(func);
      continue;
    }

    if (useDocker || funfilePath) { // force docker if funfilePath exist
      await builder.buildInDocker(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, imageTag, stages);
    } else {
      await builder.buildInProcess(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose, stages);
    }
  }

  if (buildStage) {
    const updatedTemplateContent = template.updateTemplateResources(tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);

    await fs.writeFile(path.join(rootArtifactsDir, 'template.yml'), yaml.dump(updatedTemplateContent));

    console.log(green('\nBuild Success\n'));

    console.log('Built artifacts: ' + path.relative(baseDir, rootArtifactsDir));
    console.log('Built template: ' + path.relative(baseDir, path.join(rootArtifactsDir, 'template.yml')));

    showBuildNextTips();
  } else {
    console.log(green('\nInstall Success\n'));

    showInstallNextTips();
  }
}

module.exports = {
  buildFunction, copyNasArtifact, getOrConvertFunfile
};