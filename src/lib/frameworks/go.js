'use strict';

const fs = require('fs-extra');
const path = require('path');
const { red, yellow } = require('colors');
const { promptForConfirmContinue } = require('../init/prompt');
const { findBinName } = require('./common/go');
const { exec } = require('./common/exec');
const { detectAndReplaceAddr } = require('./common/file');

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
            await detectAndReplaceAddr({
              codeDir,
              mainFileSuffix: '.go',
              mainFileRegex: 'func\\s+main\\s*\\(',
              addrProcessores: [
                // check gin and beego addr
                {
                  regex: new RegExp('\\.Run\\s*\\(\\s*\\)', 'm'),
                  replacer: `.Run("0.0.0.0:9000")`
                },
                {
                  regex: new RegExp('\\.Run\\s*\\(\\s*":\\d+"\\)', 'm'),
                  replacer: `.Run("0.0.0.0:9000")`
                }
              ]
            });

            let needBuild = true;
            let binName = await findBinName(codeDir);
            const buildCommand = 'GOARCH=amd64 GOOS=linux go build -ldflags "-s -w"';
            if (!binName) {
              const errorMessage = red(`Could not find any bin files from current folder.\n
Before using 'fun deploy', you must use '${yellow(buildCommand)}' to comile your project.`);
              console.error(errorMessage);

              if (await promptForConfirmContinue(yellow(`Let Fun exec this command for you?`))) {
                needBuild = false;
                await exec(buildCommand, codeDir);
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
              await exec(buildCommand, codeDir);
            }
          }
        }
      ]
    }
  ]
};

module.exports = go;