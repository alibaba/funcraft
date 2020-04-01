'use strict';

const fs = require('fs-extra');
const file = require('./common/file');
const path = require('path');
const { yellow, red, green } = require('colors');
const { promptForConfirmContinue } = require('../init/prompt');

const nuxtjs = {
  'id': 'nuxtjs',
  'runtime': 'nodejs',
  'website': 'https://nuxtjs.org/',
  'detectors': {
    'or': [
      {
        'type': 'regex',
        'path': 'package.json',
        'content': '"(dev)?(d|D)ependencies":\\s*{[^}]*"egg":\\s*".+?"[^}]*}'
      },
      {
        'type': 'regex',
        'path': 'package.json',
        'content': '"(dev)?(d|D)ependencies":\\s*{[^}]*"egg-bin":\\s*".+?"[^}]*}'
      }
    ]
  },
  'actions': [
    {
      'condition': true,
      'description': 'use npx nuxt to start server',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const prodConfigPath = path.join(codeDir, 'config', 'config.prod.js');
            const prodConfigContent = `'use strict';
module.exports = {
  rundir: '/tmp/run',
  logger: {
    dir: '/tmp/log'
  }
};
`
            const exists = await fs.pathExists(prodConfigPath);

            if (exists) {
              console.log(`${yellow('Fun detected')} your production config '${yellow(prodConfigPath)}' file already exists`);
              console.log(`You need to add these content to your production config file:`);
              console.log(yellow(prodConfigContent));
              if (!await promptForConfirmContinue(yellow(`Continue`))) {
                process.exit(0);
              }
            } else {
              await file.generateFile(prodConfigPath, true, parseInt('0755', 8), prodConfigContent);
            }
          }
        },
        {
          'type': 'generateFile',
          'path': 'bootstrap',
          'mode': '0755',
          'content': `#!/usr/bin/env bash
export PORT=9000
export EGG_SERVER_ENV=prod
npx --no-install egg-scripts start --workers=1
`
        }
      ]
    }
  ]
};

module.exports = nuxtjs;