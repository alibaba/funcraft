'use strict';

const { determineRepoDir, getOfficialTemplates } = require('../init/repository');
const { render } = require('../init/renderer');
const { sync } = require('rimraf');
const { buildContext } = require('../init/context');
const { promptForTemplate } = require('../init/prompt');
const debug = require('debug')('fun:init');

function cleanTemplate(repoDir) {
  debug('Cleaning Template: %', repoDir);
  sync(repoDir);
}

async function init(context) {

  debug('location is: %s', context.location);
  context.templates = getOfficialTemplates();
  if (!context.location) {
    context.location = await promptForTemplate(Object.keys(context.templates));
  }
  const {repoDir, clean} = await determineRepoDir(context);
  try {
    await buildContext(repoDir, context);
    render(context);
  } finally {
    if (clean) {
      cleanTemplate(repoDir);
    }
  }

}

module.exports = init;
