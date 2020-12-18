'use strict';

const dockerOpts = require('./docker-opts');
const fs = require('fs-extra');
const path = require('path');
const { DockerfileParser } = require('dockerfile-ast');
const debug = require('debug')('fun:build');
const { generatePwdFileInTargetDir } = require('./utils/passwd');

function generateBuildkitMountsFromDockerMounts(mountsInDocker, baseDir) {
  const mounts = [];
  mountsInDocker.forEach( m => {
    if (m.ReadOnly) {
      mounts.push(`--mount=type=${m.Type},source=${path.relative(baseDir, m.Source)},target=${m.Target}${m.ReadOnly ? '' : ',readwrite'}`);
    }
  });
  return mounts;
}

function generateSrcDstPairsFromMounts(mountsInDocker) {
  const fromSrcToDstPairsInBuild = [];
  const fromSrcToDstPairsInOutput = [];

  mountsInDocker.forEach( m => {
    fromSrcToDstPairsInBuild.push({'src': m.Source, 'dst': m.Target});
    if (!m.ReadOnly) {
      fromSrcToDstPairsInOutput.push({'src': m.Target, 'dst': m.Source});
    }
  });
  return {fromSrcToDstPairsInBuild, fromSrcToDstPairsInOutput};
}

async function dockerfileForBuildkit(runtime, fromSrcToDstPairsInOutput, fromSrcToDstPairsInBuild, contentDir, targetBuildStage, envs, cmd, workdir) {
  const image = await dockerOpts.resolveRuntimeToDockerImage(runtime, true);
  
  const content = [];
  content.push('FROM ' + await dockerOpts.resolveImageNameForPull(image) + ` as ${runtime}`);
  if (workdir) {
    content.push(`WORKDIR ${workdir}`);
  }

  if (envs) {
    envs.forEach( e => content.push(`ENV ${e}`));
  }
  if (fromSrcToDstPairsInBuild) {
    fromSrcToDstPairsInBuild.forEach( pair => content.push(`COPY ${(contentDir === pair.src || path.resolve(contentDir) === pair.src) ? './' : path.relative(contentDir, pair.src)} ${pair.dst}`));
  }
  if (cmd) {
    content.push(`RUN ${cmd}`);
  }

  if (fromSrcToDstPairsInOutput) {
    content.push(`FROM scratch as ${targetBuildStage}`);

    fromSrcToDstPairsInOutput.forEach( pair => content.push(`COPY --from=${runtime} ${pair.src} ${(contentDir === pair.dst || path.resolve(contentDir) === pair.dst) ? './' : path.relative(contentDir, pair.dst)}`));
  }
  return content.join('\n');
}

async function convertDockerfileToBuildkitFormat(dockerfilePath, fromSrcToDstPairs, baseDir, targetBuildStage) {
  const originalContent = await fs.readFile(dockerfilePath, 'utf8');
  if (!targetBuildStage || !fromSrcToDstPairs) {
    debug('There is no output args.');
    return originalContent;
  }
  const parsedContent = DockerfileParser.parse(originalContent);

  const content = [];
  const stages = [];
  for (let instruction of parsedContent.getInstructions()) {
    const ins = instruction.getInstruction();
    const range = instruction.getRange();

    content.push(instruction.getRangeContent(range));
    if (ins.toUpperCase() === 'FROM') {
      const stage = instruction.getArgumentsContent().toString().split(' as ')[1];
      if (stage) {
        stages.push(stage);
      }
    }
  }
  
  content.push(`FROM scratch as ${targetBuildStage}`);
  fromSrcToDstPairs.forEach( pair => {
    stages.forEach( stage => {
      content.push(`COPY --from=${stage} ${pair.src} ${baseDir === pair.dst ? './' : path.relative(baseDir, pair.dst)}`);
    });
  });
  
  return content.join('\n');
}



async function resolvePasswdMount(contentDir) {
  if (process.platform === 'linux') {
    return {
      Type: 'bind',
      Source: await generatePwdFileInTargetDir(contentDir),
      Target: '/etc/passwd',
      ReadOnly: true
    };
  }

  return null;
}

module.exports = { 
  generateBuildkitMountsFromDockerMounts, 
  dockerfileForBuildkit, 
  convertDockerfileToBuildkitFormat,
  generateSrcDstPairsFromMounts,
  resolvePasswdMount
};