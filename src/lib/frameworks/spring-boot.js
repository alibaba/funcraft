'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const springboot = {
  'id': 'springboot',
  'runtime': 'java',
  'website': 'https://spring.io/projects/spring-boot/',
  'detectors': {
    'and': [
      {
        'type': 'regex',
        'path': 'pom.xml',
        'content': '<artifactId>\\s*spring-boot-starter-parent\\s*</artifactId>'
      }
    ]
  },
  'actions': [
    {
      'condition': true,
      'description': 'find jar under target/ and generate bootstrap',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const targetPath = path.join(codeDir, 'target');

            if (!await fs.pathExists(targetPath)) {
              throw new Error(`you must package your spring boot project before deploying. For example, you can use 'mvn package' to package spring boot to a jar.`);
            }
            const targetContents = await fs.readdir(targetPath);

            let jarFiles = [];

            for (const file of targetContents) {
              if (_.endsWith(file, '.jar')) {
                const absFile = path.join(targetPath, file);
                const relative = path.relative(codeDir, absFile);
                jarFiles.push(relative);
              }
            }
            
            if (jarFiles.length === 0) {
              throw new Error(`could not find any jar from 'target' folder`);
            }

            if (jarFiles.length > 1) {
              throw new Error(`found more than one jar files from 'target' folder`);
            }

            const bootstrap = `#!/usr/bin/env bash
export PORT=9000
java -jar -Dserver.port=$PORT ${jarFiles[0]}
`;

            await fs.writeFile('bootstrap', bootstrap, {
              mode: '0755'
            });
          }
        }
      ]
    }
  ]
};

module.exports = springboot;