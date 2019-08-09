'use strict';

const util = require('util');
const fs = require('fs');
const path = require('path');

const lstat = util.promisify(fs.lstat);
const { red } = require('colors');

const debug = require('debug')('fun:local');

var ip = require('ip');

const allowedDebugIdes = ['vscode'];

function getDebugIde(options) {
  if (options.config) {
    const debugIde = options.config;

    if (allowedDebugIdes.indexOf(debugIde.toLowerCase()) > -1) {
      return debugIde;
    } 
    throw new Error(red(`Error parsing debug config. Option is one of: ${JSON.stringify(allowedDebugIdes)}`));
  }

  return null;
}

function getDebugPort(options) {
  let debugPort = options.debugPort;

  if (debugPort) {
    debugPort = parseInt(debugPort);

    if (Number.isNaN(debugPort)) {
      throw Error(red('debugPort must be number'));
    }
  }

  debug(`debugPort: ${debugPort}`);

  return debugPort;
}

async function generateVscodeDebugConfig(serviceName, functionName, runtime, codePath, debugPort) {

  const stats = await lstat(codePath);

  if (!stats.isDirectory()) {
    codePath = path.dirname(codePath);
  }

  switch (runtime) {
  case 'nodejs6':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': debugPort,
          'localRoot': `${codePath}`,
          'remoteRoot': '/code',
          'protocol': 'legacy',
          'stopOnEntry': false
        }
      ]
    };
  case 'nodejs10':
  case 'nodejs8':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': debugPort,
          'localRoot': `${codePath}`,
          'remoteRoot': '/code',
          'protocol': 'inspector',
          'stopOnEntry': false
        }
      ]
    };
  case 'python3':
  case 'python2.7':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'python',
          'request': 'attach',
          'host': 'localhost',
          'port': debugPort,
          'pathMappings': [
            {
              'localRoot': `${codePath}`,
              'remoteRoot': '/code'
            }
          ]
        }
      ]
    };
  case 'java8':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'java',
          'request': 'attach',
          'hostName': 'localhost',
          'port': debugPort
        }
      ]
    };
  case 'php7.2':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'php',
          'request': 'launch',
          'port': debugPort,
          'stopOnEntry': false,
          'pathMappings': {
            '/code': `${codePath}`
          },
          'ignore': [
            '/var/fc/runtime/**'
          ]
        }
      ]
    };
  default:
    break;
  }

  debug('CodePath: ' + codePath);
}

function generateDebugEnv(runtime, debugPort) {
  const remoteIp = ip.address();

  switch (runtime) {
  case 'nodejs10':
  case 'nodejs8':
    return { 'DEBUG_OPTIONS': `--inspect-brk=0.0.0.0:${debugPort}` };
  case 'nodejs6':
    return { 'DEBUG_OPTIONS': `--debug-brk=${debugPort}` };
  case 'python2.7':
  case 'python3':
    return { 'DEBUG_OPTIONS': `-m ptvsd --host 0.0.0.0 --port ${debugPort} --wait` };
  case 'java8':
    return { 'DEBUG_OPTIONS': `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${debugPort}` };
  case 'php7.2':
    console.log(`using remote_ip ${remoteIp}`);
    return { 'XDEBUG_CONFIG': `remote_enable=1 remote_autostart=1 remote_port=${debugPort} remote_host=${remoteIp}` };
  default:
    throw new Error(red('could not found runtime.'));
  }
}

function generateDockerDebugOpts(runtime, debugPort) {
  const exposedPort = `${debugPort}/tcp`;

  if (runtime === 'php7.2') { return {}; }

  return {
    ExposedPorts: {
      [exposedPort]: {}
    },
    HostConfig: {
      PortBindings: {
        [exposedPort]: [
          {
            'HostIp': '',
            'HostPort': `${debugPort}`
          }
        ]
      }
    }
  };
}

module.exports = {
  generateVscodeDebugConfig, generateDebugEnv, generateDockerDebugOpts,
  getDebugIde, getDebugPort
};