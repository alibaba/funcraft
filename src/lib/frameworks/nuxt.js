'use strict';

const nuxtjs = {
  'id': 'nuxtjs',
  'runtime': 'nodejs',
  'website': 'https://nuxtjs.org/',
  'detectors': {
    'and': [
      {
        'type': 'regex',
        'path': 'package.json',
        'content': '"(dev)?(d|D)ependencies":\\s*{[^}]*"nuxt":\\s*".+?"[^}]*}'
      }
    ]
  },
  'actions': [
    {
      'condition': true,
      'description': 'use npx nuxt to start server',
      'processors': [
        {
          'type': 'generateFile',
          'path': 'bootstrap',
          'mode': '0755',
          'content': `#!/usr/bin/env bash
export PORT=9000
npx nuxt start --hostname 0.0.0.0 --port $PORT
`
        }
      ]
    }
  ]
};

module.exports = nuxtjs;