'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const file = require('./common/file');
const { downloadJetty } = require('./common/java');
const { updateIgnore } = require('../package/ignore');

const downloadJettyProcessor = {
  'type': 'function',
  'function': async (codeDir) => {
    const dotFunPath = path.join(codeDir, '.fun');
    await fs.ensureDir(dotFunPath);
    await downloadJetty(codeDir);
  }
};

const updateFunIgnoreProcessor = {
  'type': 'function',
  'function': async (codeDir, baseDir) => {
    updateIgnore(baseDir, [
      'target/*',
      '!target/*.war',
      '!target/context.xml',
      'src',
      '.gradle',
      '.settings/',
      '.classpath',
      '.project',
      '.settings',
      '.springBeans',
      'bin/',
      '.idea/',
      '.idea',
      '*.iws',
      '*.iml',
      '*.ipr',
      '.DS_Store'
    ]);
  }
};

async function generateBootstrap(codeDir, warPath) {
  const bootstrap = `#!/usr/bin/env bash
export JETTY_RUNNER=/code/.fun/root/usr/local/java/jetty-runner.jar
export PORT=9000
java -jar $JETTY_RUNNER --port $PORT --path / ${warPath}
`;
  
  await fs.writeFile(path.join(codeDir, 'bootstrap'), bootstrap, {
    mode: '0755'
  });
}

const war = {
  'id': 'war',
  'runtime': 'java',
  'website': 'https://en.wikipedia.org/wiki/WAR_(file_format)',
  'detectors': {
    'or': [
      {
        'type': 'regex',
        'path': 'pom.xml',
        'content': '<packaging>\\s*war\\s*</packaging>'
      },
      {
        'type': 'file',
        'path': /\.war$/
      }
    ]
  },
  'actions': [
    {
      'condition': {
        'and': [
          {
            'type': 'file',
            'path': /\.war$/
          }
        ]
      },
      'processors': [
        downloadJettyProcessor,
        {
          'type': 'function',
          'function': async (codeDir) => {
            const wars = await file.listDir(codeDir, /\.war$/);

            if (wars.length > 1) {
              throw new Error('We detected you have more than 1 war in current folder.');
            }

            await generateBootstrap(codeDir, path.relative(codeDir, wars[0]));
          }
        },
        updateFunIgnoreProcessor
      ]
    },
    {
      'condition': true,
      'description': 'find war under target/ and generate bootstrap',
      'processors': [
        downloadJettyProcessor,
        {
          'type': 'function',
          'function': async (codeDir) => {
            const targetPath = path.join(codeDir, 'target');

            if (!await fs.pathExists(targetPath)) {
              throw new Error(`Please packaging your maven project before deploying.
You could use 'mvn package' to package a WAR.`);
            }
            const targetContents = await fs.readdir(targetPath);

            let warFiles = [];

            for (const file of targetContents) {
              if (_.endsWith(file, '.war')) {
                const absFile = path.join(targetPath, file);
                const relative = path.relative(codeDir, absFile);
                warFiles.push(relative);
              }
            }

            if (warFiles.length === 0) {
              throw new Error(`Could not find any WAR from 'target' folder.
You can use 'mvn package' to package a WAR.`);
            }

            if (warFiles.length > 1) {
              throw new Error(`Found more than one jar files from 'target' folder`);
            }

            await generateBootstrap(codeDir, warFiles[0]);
          }
        },
        updateFunIgnoreProcessor
      ]
    }

  ]
};

module.exports = war;