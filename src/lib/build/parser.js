'use strict';

const _ = require('lodash');

const fs = require('fs-extra');
const dockerOpts = require('../docker-opts');

const { yellow } = require('colors');
const { FunModule } = require('../install/module');
const { DockerfileParser } = require('dockerfile-ast');

const RESERVED_DOCKER_CMD = [
  'FROM', 'Add', 'ONBUILD',
  'ARG', 'CMD', 'ENTRYPOINT',
  'VOLUME', 'STOPSIGNAL'];

function resolveEnv(envs = {}) {
  if (_.isString(envs)) {
    throw new Error('fun.yml env property must be a map');
  }

  return _.map(envs || {}, (v, k) => {
    if (k === 'PATH') {
      return `${k}=${v}:$PATH`;
    } else if (k === 'LD_LIBRARY_PATH') {
      return `${k}=${v}:$LD_LIBRARY_PATH`;
    }
    return `${k}=${v}`;
  });
}

function funymlToFunfile(funymlPath) {

  const funModule = FunModule.load(funymlPath);
  const runtime = funModule.runtime;
  let firstAptCmd = true;
  let firstShellCmd = true;

  const content = [];

  content.push(`RUNTIME ${runtime}`);
  content.push('WORKDIR /code');

  for (const t of funModule.tasks) {
    let env = resolveEnv(t.attrs.env).join(' ');
    if (!_.isEmpty(env)) {
      env = ' ' + env;
    }
    
    const target = t.attrs.target;
    let targetParameter = '';

    if (target) {
      targetParameter = ` -t ${target}`;
    }

    const cwd = t.attrs.cwd;

    let cwdCmd = '';

    if (cwd) {
      cwdCmd = ` cd ${cwd} &&`;
    }

    switch (t.type) {
    case 'pip': {
      if (t.attrs.local) {
        content.push(`RUN${cwdCmd}${env} fun-install pip install ${t.attrs.pip}${targetParameter}`);
      } else {
        content.push(`RUN${cwdCmd}${env} pip install ${t.attrs.pip}`);
      }
      break;
    }
    case 'apt': {
      if (t.attrs.local) {
        content.push(`RUN${cwdCmd}${env} fun-install apt-get install ${t.attrs.apt}${targetParameter}`);
      } else {
        if (firstAptCmd) {
          content.push(`RUN apt-get update`);
        }
        content.push(`RUN${cwdCmd}${env} apt-get install ${t.attrs.apt}`);
      }

      firstAptCmd = false;
      break;
    }
    case 'shell': {
      // If add `COPY . /code` all the time, there is no way to reuse the docker build cache.
      // However, without `COPY . /code`, it may encounter exceptions when depending resources on code.
      // So now add `COPY . /code` only if funyml contains shell cmd
      // see https://github.com/alibaba/funcraft/issues/483
      // see https://github.com/alibaba/funcraft/issues/448
      if (firstShellCmd) {
        content.push('COPY . /code');
        firstShellCmd = false;
      }

      const commands = _.split(t.attrs.shell, '\n');

      let first = true;
      for (const command of commands) {
        if (command) {
          if (first) {
            content.push(`RUN${cwdCmd}${env} ${command}`);
            first = false;
          } else {
            const lastCommand = content.pop();
            content.push(`${lastCommand} \\`);
            content.push(` ${env} ${command}`);
          }
        }
      }

      break;
    }
    default:
      console.error('unkown task %s', t);
    }
  }

  return content.join('\n');
}

async function funfileToDockerfile(funfilePath, runtime, serviceName, functionName) {

  const content = await fs.readFile(funfilePath, 'utf8');

  const funfile = DockerfileParser.parse(content);

  const dockerfile = [];

  for (let instruction of funfile.getInstructions()) {

    const ins = instruction.getInstruction();

    if (_.includes(RESERVED_DOCKER_CMD, ins)) {
      throw new Error(`Currently, Funfile does not support the semantics of '${ins}'. 
If you have a requirement, you can submit the issue at https://github.com/alibaba/funcraft/issues.`);
    }

    if (ins.toUpperCase() === 'RUNTIME') {
      const runtimeArgs = instruction.getArguments();

      if (runtimeArgs.length !== 1) {
        throw new Error('invalid RUNTIME for Funfile');
      }

      const runtimeOfFunfile = runtimeArgs[0].getValue();

      if (runtimeOfFunfile !== runtime) {
        console.warn(yellow(`\nDetectionWarning: The 'runtime' of '${serviceName}/${functionName}' in your template.yml is inconsistent with that in Funfile.`));
      }

      const imageName = await dockerOpts.resolveRuntimeToDockerImage(runtimeOfFunfile, true);
      dockerfile.push('FROM ' + await dockerOpts.resolveImageNameForPull(imageName) + ` as ${runtimeOfFunfile}`);
    } else {
      const range = instruction.getRange();

      dockerfile.push(instruction.getRangeContent(range));
    }
  }

  return dockerfile.join('\n');
}

function parsePairs(val, vars) {
  /*
   * Key-value pairs, separated by equal signs
   * keys can only contain letters, numbers, and underscores
   * values can be any character
   */
  const group = val.match(/(^[a-zA-Z_][a-zA-Z\d_]*)=.*/);
  vars = vars || {};
  if (group) {
    vars[group[1]] = val.substring(val.indexOf('=') + 1); // fix: https://github.com/alibaba/funcraft/issues/1030
  }
  return vars;
}

module.exports = { funymlToFunfile, funfileToDockerfile, resolveEnv, parsePairs };