'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:deploy');
const _ = require('lodash');

const { yellow, red, green } = require('colors');
const { ensureFilesModified } = require('../utils/file');
const { detectTplPath, validateTplName } = require('../tpl');
const { promptForConfirmContinue, promptForInputContinue } = require('../init/prompt');
const { detectFramework, generateTemplateContent, execFrameworkActions } = require('../frameworks/framework');

async function deploy(context) {
  let tplPath = context.template;

  if (!tplPath) {
    tplPath = await detectTplPath(true, ['template.packaged.yml']);
  }

  if (!tplPath) {
    console.warn(red('current folder is not a fun project.'));
    if (!context.assumeYes
      && !await promptForConfirmContinue('Let Fun create one for you'))
    { return; }

    const baseDir = process.cwd();
    const codeDir = baseDir;

    const framework = await detectFramework(codeDir);

    if (framework) {
      debug('detected framework', framework);
      let name = _.kebabCase(path.basename(codeDir));

      if (!context.assumeYes) {
        name = (await promptForInputContinue(`What’s your service and function name?`, name)).input;
      }

      await execFrameworkActions(codeDir, baseDir, framework);

      tplPath = path.join(codeDir, 'template.yml');

      console.log(green('Generating template.yml...'));
      const templateYmlContent = await generateTemplateContent(name, framework);
      await fs.writeFile(tplPath, templateYmlContent);

      console.log(green('Generate Fun project successfully!'));

      console.log(yellow('\n\n========= Fun will use \'fun deploy\' to deploy your application to Function Compute! ========='));
    } else {
      throw new Error(red('could not detect your project framework, please contact us on https://github.com/alibaba/funcraft/issues'));
    }
  }

  validateTplName(tplPath);

  await ensureFilesModified(tplPath);

  await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
}

module.exports = deploy;
