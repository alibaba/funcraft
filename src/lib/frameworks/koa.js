'use strict';

const path = require('path');
const { detectAndReplaceAddr, generateFile } = require('./common/file');
const { red } = require('colors');
const { isFcConsoleApplication } = require('./common/console');

const mainFileSuffix = '.js';
const mainFileRegex = '\\.listen\\s*\\(';

const addrProcessores = [
  { // .listen(8000, () => console.log('server started'));
    regex: new RegExp('\\.listen\\s*\\(\\s*([-0-9a-zA-Z._]+)\\s*,', 'm'),
    replacer: (match, p1) => {
      return `.listen(process.env.PORT || ${p1},`;
    }
  },
  { // .listen(8000);
    regex: new RegExp('\\.listen\\s*\\(\\s*([-0-9a-zA-Z._]+)\\s*\\)', 'm'),
    replacer: (match, p1) => {
      return `.listen(process.env.PORT || ${p1})`;
    }
  },
  { // .listen();
    regex: new RegExp('\\.listen\\s*\\(\\s*\\)', 'm'),
    replacer: (match) => {
      return `.listen(process.env.PORT || 9000)`;
    }
  }
];

const koa = {
  'id': 'Koa',
  'runtime': 'nodejs',
  'website': 'https://koajs.com',
  'detectors': {
    'and': [
      {
        'type': 'regex',
        'path': 'package.json',
        'content': '"(dev)?(d|D)ependencies":\\s*{[^}]*"koa":\\s*".+?"[^}]*}'
      }
    ]
  },
  'actions': [
    {
      'condition': {
        'and': [
          {
            'type': 'json',
            'path': 'package.json',
            'jsonKey': 'scripts.start'
          }
        ]
      },
      'description': 'if found start script, use npm run start directly',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {

            await detectAndReplaceAddr({
              codeDir,
              mainFileSuffix,
              mainFileRegex,
              addrProcessores
            });
          }
        },
        {
          'type': 'generateFile',
          'path': 'bootstrap',
          'mode': parseInt('0755', 8),
          'content': `#!/usr/bin/env bash
${isFcConsoleApplication() ? '' : 'export PORT=9000'}
npm run start`
        }
      ]
    },
    {
      'condition': true,
      'description': '如果不是 generator 生成的，且没有 start script，则直接查找 mainFile',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const { mainFile } = await detectAndReplaceAddr({
              codeDir,
              mainFileSuffix,
              mainFileRegex,
              addrProcessores
            });

            const bootstrap = `#!/usr/bin/env bash
${isFcConsoleApplication() ? '' : 'export PORT=9000'}
node ${path.relative(codeDir, mainFile)}`;

            if (!mainFile) {
              throw new Error(red('Could not find any koa main file. You must add \'start\' script to package.json manully'));
            }

            await generateFile(path.join(codeDir, 'bootstrap'), true, parseInt('0755', 8), bootstrap);
          }
        }
      ]
    }
  ]
};

module.exports = koa;