'use strict';

const path = require('path');
const fs = require('fs-extra');
const { downloadDjango } = require('./common/python')
const debug = require('debug')('fun:deploy');

const dlDjangoProcessor = {
    'type': 'function',
    'function': async (codeDir) => {
      const dotFunPath = path.join(codeDir, '.fun');
      await fs.ensureDir(dotFunPath);
      await downloadDjango(codeDir);
    }
};

async function generateBootstrap(codeDir, prjName) {
    const bootstrap = `#!/usr/bin/env bash
export UVICORN=/code/.fun/python/bin/uvicorn
export PORT=9000
$UVICORN --host 0.0.0.0 --port $PORT ${prjName}.asgi:application
`;
    
    await fs.writeFile(path.join(codeDir, 'bootstrap'), bootstrap, {
      mode: '0755'
    });
}

async function detectProjectName(codeDir) {

    const mgrPyContent = await fs.readFile(path.join(codeDir, 'manage.py'));
    const match = /'DJANGO_SETTINGS_MODULE',\s+'(.+)\.settings'/.exec(mgrPyContent);

    if(match){
        const prjName = match[1];
        debug(`detect Django project name is '${prjName}'`);
        return prjName;
    } else{
        throw new Error("Cannot detect project name from manage.py");
    }

}

const django = {
    'id': 'django',
    'runtime': 'python',
    'website': 'https://www.djangoproject.com/',
    'detectors': {
      'and': [
        {
          'type': 'regex',
          'path': 'manage.py',
          'content': '[Dd]jango'
        }
      ]
    },
    'actions': [
        {
            'condition': true,
            'description': 'download uvicorn and generate bootstrap',
            'processors': [
                dlDjangoProcessor,
                {
                    'type': 'function',
                    'function': async (codeDir) => {
                        const prjName = await detectProjectName(codeDir);
                        await generateBootstrap(codeDir, prjName);
                    }
                }
            ]
        }
    ]
}

module.exports = django;

