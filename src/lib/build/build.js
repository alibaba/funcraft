'use strict';

const path = require('path');
const debug = require('debug')('fun:build');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const nas = require('../nas');
const ncp = require('../utils/ncp');
const util = require('util');
const ncpAsync = util.promisify(ncp);
const taskflow = require('./taskflow');
const template = require('./template');
const artifact = require('./artifact');
const docker = require('../docker');
const uuid = require('uuid');
const parser = require('./parser');
const builder = require('./builder');
const fcBuilders = require('@alicloud/fc-builders');

const { yellow } = require('colors');
const { green, red } = require('colors');
const { recordMtimes } = require('../utils/file');
const { findFunctionsInTpl } = require('../definition');
const { DEFAULT_NAS_PATH_SUFFIX } = require('../tpl');
const { dockerBuildAndPush, buildkitBuild } = require('./build-image');
const { execSync } = require('child_process');
const { isCustomContainerRuntime } = require('../common/model/runtime');

const _ = require('lodash');
const { convertDockerfileToBuildkitFormat } = require('../buildkit');
const { promptForConfirmContinue } = require('../init/prompt');

async function convertFunYmlToFunfile(funymlPath, funfilePath) {
  const generatedFunfile = await parser.funymlToFunfile(funymlPath);

  await fs.writeFile(funfilePath, generatedFunfile);
}

async function convertFunfileToDockerfile(funfilePath, dockerfilePath, runtime, serviceName, functionName) {
  const dockerfileContent = await parser.funfileToDockerfile(funfilePath, runtime, serviceName, functionName);

  await fs.writeFile(dockerfilePath, dockerfileContent);
}

async function formatDockerfileForBuildkit(dockerfilePath, fromSrcToDstPairs, baseDir, targetBuildStage) {
  if (!fromSrcToDstPairs) {
    debug('There are no fromSrcToDstPairs');
    return;
  }
  const dockerfileContent = await convertDockerfileToBuildkitFormat(dockerfilePath, fromSrcToDstPairs, baseDir, targetBuildStage);

  await fs.writeFile(dockerfilePath, dockerfileContent);
}

async function assertCodeUriExist(codeUri) {
  if (!(await fs.pathExists(codeUri))) {
    throw new Error(`CodeUri ${codeUri} is not exist.`);
  }
}

async function copyNasArtifactFromLocal(rootArtifactsDir, funcArtifactDir) {
  // if .fun/nas exist in funcArtifactDir , fun will move to rootartifactsDir
  const funcNasFolder = path.join(funcArtifactDir, DEFAULT_NAS_PATH_SUFFIX);
  const rootNasFolder = path.join(rootArtifactsDir, DEFAULT_NAS_PATH_SUFFIX);

  if (await fs.pathExists(funcNasFolder) && funcNasFolder !== rootNasFolder) {
    console.log(`moving ${funcNasFolder} to ${rootNasFolder}`);

    await fs.ensureDir(rootNasFolder);

    await ncpAsync(funcNasFolder, rootNasFolder);
    await fs.remove(funcNasFolder);
  }
}

async function copyNasArtifactFromImage(nasMappings, imageTag) {
  if (nasMappings) {
    for (let nasMapping of nasMappings) {
      const localNasDir = nasMapping.localNasDir;
      let remoteNasDir = nasMapping.remoteNasDir;

      if (!remoteNasDir.endsWith('/')) {
        remoteNasDir += '/';
      }

      try {
        console.log('copy from container ' + remoteNasDir + '.' + ' to ' + localNasDir);
        await docker.copyFromImage(imageTag, remoteNasDir + '.', localNasDir);
      } catch (e) {
        debug(`copy from image ${imageTag} directory ${remoteNasDir} to ${localNasDir} error`, e);
      }
    }
  }
}

async function copyNasArtifact(nasMappings, imageTag, rootArtifactsDir, funcArtifactDir) {
  await copyNasArtifactFromLocal(rootArtifactsDir, funcArtifactDir);

  await copyNasArtifactFromImage(nasMappings, imageTag);
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

async function processFunfile(serviceName, serviceRes, codeUri, funfilePath, baseDir, funcArtifactDir, runtime, functionName) {
  console.log(yellow('Funfile exist, Fun will use container to build forcely'));

  const dockerfilePath = path.join(codeUri, '.Funfile.generated.dockerfile');
  await convertFunfileToDockerfile(funfilePath, dockerfilePath, runtime, serviceName, functionName);

  const nasConfig = (serviceRes.Properties || {}).NasConfig;
  let nasMappings;
  if (nasConfig) {
    nasMappings = await nas.convertNasConfigToNasMappings(nas.getDefaultNasDir(baseDir), nasConfig, serviceName);
  }

  const tag = `fun-cache-${uuid.v4()}`;
  const imageTag = await docker.buildImage(codeUri, dockerfilePath, tag);

  // copy fun install generated artifact files to artifact dir
  console.log(`copying function artifact to ${funcArtifactDir}`);
  await docker.copyFromImage(imageTag, '/code/.', funcArtifactDir);

  // process nas folder
  await copyNasArtifact(nasMappings, imageTag, baseDir, funcArtifactDir);
  await fs.remove(dockerfilePath);

  return imageTag;
}

async function processFunfileForBuildkit(serviceName, serviceRes, codeUri, funfilePath, baseDir, funcArtifactDir, runtime, functionName) {
  console.log(yellow('Funfile exist and useBuildkit is specified, Fun will use buildkit to build'));
  const dockerfilePath = path.join(codeUri, '.Funfile.buildkit.generated.dockerfile');

  await convertFunfileToDockerfile(funfilePath, dockerfilePath, runtime, serviceName, functionName);

  const fromSrcToDstPairs = [{
    'src': '/code',
    'dst': funcArtifactDir
  }];

  const nasConfig = (serviceRes.Properties || {}).NasConfig;
  let nasMappings;
  if (nasConfig) {
    nasMappings = await nas.convertNasConfigToNasMappings(nas.getDefaultNasDir(baseDir), nasConfig, serviceName);
    if (nasMappings) {
      for (let nasMapping of nasMappings) {
        const localNasDir = nasMapping.localNasDir;
        let remoteNasDir = nasMapping.remoteNasDir;
  
        if (!remoteNasDir.endsWith('/')) {
          remoteNasDir += '/';
        }
        fromSrcToDstPairs.push({
          'src': remoteNasDir,
          'dst': localNasDir
        });
      }
    }
  }
  // 复制本地 NAS 内容
  await copyNasArtifactFromLocal(baseDir, funcArtifactDir);

  // 生成 dockerfile
  const targetBuildStage = 'buildresult';
  await formatDockerfileForBuildkit(dockerfilePath, fromSrcToDstPairs, baseDir, targetBuildStage);

  execSync(
    `buildctl build --no-cache --frontend dockerfile.v0 --local context=${baseDir} --local dockerfile=${path.dirname(dockerfilePath)} --opt target=${targetBuildStage} --opt filename=${path.basename(dockerfilePath)} --output type=local,dest=${baseDir}`, {
      stdio: 'inherit'
    });

  await fs.remove(dockerfilePath);
}

const metaFiles = ['.', 'pom.xml', 'package.json', 'package-lock.json', 'requirements.txt', 'composer.json',
  path.join('src', 'main', 'java')
];

async function recordMetaData(baseDir, functions, tplPath, metaPath, buildOps) {

  const metaPaths = _.flatMap(functions, (func => {
    const { functionRes } = func;
    const codeUri = (functionRes.Properties || {}).CodeUri;

    const asbBaseDir = path.resolve(baseDir);

    let absCodeUri;

    if (!codeUri) {
      absCodeUri = asbBaseDir;
    } else {
      absCodeUri = path.resolve(baseDir, codeUri);
    }

    return metaFiles
      .map(metaFile => { return path.join(absCodeUri, metaFile); })
      .filter(metaFile => { return fs.pathExistsSync(metaFile); });
  }));

  await recordMtimes([...metaPaths, tplPath], buildOps, metaPath);
}

async function buildFunction(buildName, tpl, baseDir, useDocker, useBuildkit, stages, verbose, tplPath, assumeYes) {
  const buildStage = _.includes(stages, 'build');
  const escapeDockerArgsInBuildFC = +process.env.escapeDockerArgsInBuildFC;
  const setBuildkitArgsDefaultInBuildFC = +process.env.setBuildkitArgsDefaultInBuildFC;
  if (setBuildkitArgsDefaultInBuildFC) {
    debug(`set useBuildkit arg default when building function`);
    useDocker = false;
    useBuildkit = true;
  } else if (useDocker && escapeDockerArgsInBuildFC) {
    debug(`escape useDocker arg when building function`);
    useDocker = false;
    useBuildkit = true;
  }

  if (useDocker) {
    console.log(green(`start ${buildStage ? 'building' : 'installing'} functions using docker`));
  } else if (useBuildkit) {
    console.log(green(`start ${buildStage ? 'building' : 'installing'} functions using buildkit`));
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

  await detectFunFile(baseDir, tpl);

  for (let func of buildFuncs) {
    const { functionName, serviceName, serviceRes, functionRes } = func;

    console.log();
    console.log(green(`building ${serviceName}/${functionName}`));

    const runtime = functionRes.Properties.Runtime;
    const codeUri = functionRes.Properties.CodeUri;
    if (isCustomContainerRuntime(runtime)) {
      if (!buildStage) {
        continue;
      }
      if (!useDocker && !useBuildkit) {
        throw new Error(`Runtime custom-container must use --use-docker or --use-buildkit`);
      }
      if (useDocker) {
        await dockerBuildAndPush(codeUri, functionRes.Properties.CustomContainerConfig.Image, baseDir, functionName, serviceName);
      } else if (useBuildkit) {
        const msg = `Use fun build to build image and push to ${functionRes.Properties.CustomContainerConfig.Image}.Please confirm to continue.`;
        if (!assumeYes && !await promptForConfirmContinue(msg)) {
          skippedBuildFuncs.push(func);
          continue;
        }
        await buildkitBuild(codeUri, functionRes.Properties.CustomContainerConfig.Image, baseDir, functionName, serviceName);
      }
      continue;
    }
    const absCodeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);

    await assertCodeUriExist(absCodeUri);

    if ((runtime === 'java8' || runtime === 'java11') && (absCodeUri.endsWith('.zip') || absCodeUri.endsWith('.jar') || absCodeUri.endsWith('.war'))) {
      console.warn(red(`\nDetectionWarning: your codeuri is '${codeUri}', and 'fun build' will not compile your functions. It is recommended that you modify ${serviceName}/${functionName}'s 'CodeUri' property to the directory where 'pom.xml' is located.`));
    }

    let funcArtifactDir;
    if (buildStage) {
      funcArtifactDir = await artifact.generateArtifactDirectory(rootArtifactsDir, serviceName, functionName);
      await artifact.cleanDirectory(funcArtifactDir);
    } else {
      funcArtifactDir = absCodeUri;
    }

    const Builder = fcBuilders.Builder;
    const taskFlows = await Builder.detectTaskFlow(runtime, absCodeUri);

    const funfilePath = await getOrConvertFunfile(absCodeUri);

    let imageTag;

    // if Funfile exist,use docker or buildkit.
    if (funfilePath) {
      if (useBuildkit || escapeDockerArgsInBuildFC) {
        await processFunfileForBuildkit(serviceName, serviceRes, absCodeUri, funfilePath, baseDir, funcArtifactDir, runtime, functionName);
        useDocker = false;
        useBuildkit = true;
      } else { // force docker if funfilePath exist and escapeDockerArgsInBuildFC not exist
        imageTag = await processFunfile(serviceName, serviceRes, absCodeUri, funfilePath, baseDir, funcArtifactDir, runtime, functionName);
        useDocker = true;
      }
    }
    // For build stage, Fun needn't compile functions only if there are no manifest file and no Funfile.
    // For install stage, Fun needn't compile functions only if there are no manifest file.
    const manifestExist = !(_.isEmpty(taskFlows) || taskflow.isOnlyDefaultTaskFlow(taskFlows));

    if ((buildStage && (!funfilePath && !manifestExist))
      || (!buildStage && !manifestExist)) {
      debug(`could not find any manifest file for ${func.serviceName}/${func.functionName}, [${stages}] stage for manifest will be skipped`);
      skippedBuildFuncs.push(func);
      continue;
    }

    if (useBuildkit) {
      await builder.buildInBuildkit(serviceName, serviceRes, functionName, functionRes, baseDir, absCodeUri, funcArtifactDir, verbose, stages);
    } else if (useDocker) {
      await builder.buildInDocker(serviceName, serviceRes, functionName, functionRes, baseDir, absCodeUri, funcArtifactDir, verbose, imageTag, stages);
    } else {
      await builder.buildInProcess(serviceName, functionName, absCodeUri, runtime, funcArtifactDir, verbose, stages);
    }
  }
  if (buildStage) {
    const updatedTemplateContent = template.updateTemplateResources(tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);

    await fs.writeFile(path.join(rootArtifactsDir, 'template.yml'), yaml.dump(updatedTemplateContent));
    // save meta data
    await recordMetaData(baseDir, buildFuncs, tplPath, path.resolve(rootArtifactsDir, 'meta.json'), {
      'useDocker': useDocker,
      'verbose': verbose,
      'buildName': buildName
    });

    console.log(green('\nBuild Success\n'));

    console.log('Built artifacts: ' + path.relative(baseDir, rootArtifactsDir));
    console.log('Built template: ' + path.relative(baseDir, path.join(rootArtifactsDir, 'template.yml')));
  } else {
    console.log(green('\nInstall Success\n'));
  }
}

async function detectFunFile(baseDir, tpl) {
  const funfilePath = path.join(baseDir, 'Funfile');
  if (await fs.pathExists(funfilePath)) {

    const codeUris = findFunctionsInTpl(tpl).map(func => {
      return path.resolve(baseDir, func.functionRes.Properties.CodeUri);
    });

    if (!_.includes(codeUris, baseDir)) {
      console.warn(red(`\nFun detected that the '${path.resolve(funfilePath)}' is not included in any CodeUri.\nPlease make sure if it is the right configuration. if yes, ignore please.`));
    }
  }
}

module.exports = {
  buildFunction, copyNasArtifact, getOrConvertFunfile, copyNasArtifactFromLocal
};