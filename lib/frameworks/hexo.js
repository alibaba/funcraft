'use strict';

const hexo = {
  'id': 'Hexo',
  'runtime': 'nodejs',
  'website': 'https://hexo.io/',
  'detectors': {
    'and': [
      {
        'type': 'regex',
        'path': 'package.json',
        'content': '"(dev)?(d|D)ependencies":\\s*{[^}]*"hexo":\\s*".+?"[^}]*}'
      }
    ]
  },
  'actions': [
    {
      'condition': true,
      'description': 'use npx next to start server',
      'processors': [
        {
          'type': 'generateFile',
          'path': 'bootstrap',
          'mode': '0755',
          'content': `#!/usr/bin/env bash
export PORT=9000
npx hexo server -p $PORT -s
`
        }
      ]
    }
  ]
};

module.exports = hexo;