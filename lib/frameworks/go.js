'use strict';

const fs = require('fs-extra');
const path = require('path');
const { red, yellow } = require('colors');
const _ = require('lodash');
const { promptForConfirmContinue } = require('../init/prompt');
const { findBinName } = require('./common/go');
const { exec } = require('./common/exec');
const debug = require('debug')('fun:deploy');

async function findMainFile(codeDir) {
  const regex = new RegExp('func\\s+main\\s*\\(', 'm');

  const files = await fs.readdir(codeDir);
  for (const file of files) {
    if (!_.endsWith(file, '.go')) { continue; }
    const contents = await fs.readFile(file, 'utf8');
    if (regex.test(contents)) {
      debug('mainFile is ', file);

      return file;
    }
  }

  return null;
}

async function detectAndReplaceAddr(codeDir) {
  const mainFile = await findMainFile(codeDir);
  if (!mainFile) { return; }

  const mainFileContents = await fs.readFile(mainFile, 'utf8');

  // check gin and beego addr
  const addrRegexs = [new RegExp('\\.Run\\s*\\(\\s*\\)', 'm'), new RegExp('\\.Run\\s*\\(\\s*":\\d+"\\)', 'm')];

  for (const addrRegex of addrRegexs) {
    if (addrRegex.test(mainFileContents)) {
      console.log(yellow(`Fun detected your application doesn't listen on '0.0.0.0:9000' in ${mainFile}`));
      console.log(yellow(`Fun will replace your addr to '0.0.0.0:9000', and also backup your origin file ${mainFile} to ${mainFile}.bak`));

      if (!await promptForConfirmContinue(yellow(`Are your sure?`))) {
        console.warn(red(`Fun will not modify your application listen addr, but if you want deploy to fc, you must listen on '0.0.0.0:9000'`));
        return;
      }

      const replacedContent = mainFileContents.replace(addrRegex, (match, p1) => {
        return `.Run("0.0.0.0:9000")`;
      });

      await fs.copyFile(mainFile, mainFile + '.bak');
      await fs.writeFile(mainFile, replacedContent);

      return ;
    }
  }
}

const go = {
  'id': 'gomodules',
  'runtime': 'go',
  'website': 'https://golang.org/',
  'detectors': {},
  'actions': [
    {
      'condition': true,
      'description': 'select binary from bin/ folder to start',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            await detectAndReplaceAddr(codeDir);

            let needBuild = true;
            let binName = await findBinName(codeDir);
            const buildCommand = 'GOARCH=amd64 GOOS=linux go build -ldflags "-s -w"';
            if (!binName) {
              const errorMessage = red(`Could not find any bin files from current folder.\n
Before using 'fun deploy', you must use '${yellow(buildCommand)}' to comile your project.`);
              console.error(errorMessage);

              if (await promptForConfirmContinue(yellow(`Let Fun exec this command for you?`))) {
                needBuild = false;
                await exec(buildCommand);
              }

              binName = await findBinName(codeDir);
              if (!binName) {
                throw new Error(red('could not find any bin files from current folder'));
              }
            }

            const content = `#!/usr/bin/env bash
export PORT=9000
export GIN_MODE=release
./${binName}`;

            const bootstrapPath = path.join(codeDir, 'bootstrap');
            await fs.writeFile(bootstrapPath, content, {
              mode: parseInt('0755', 8)
            });

            console.log(`${yellow('Tips:')} 
You must use '${yellow(buildCommand)}' to ${yellow('recompile')} your project every time before using fun deploy.`);
            if (needBuild && await promptForConfirmContinue(yellow(`Let Fun exec this command now for you?`))) {
              await exec(buildCommand);
            }
          }
        }
      ]
    }
  ]
};

module.exports = go;