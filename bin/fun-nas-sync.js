#!/usr/bin/env node

/* eslint-disable quotes */
'use strict';
const program = require('commander');

const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');
const commaSeparatedList = (value, dummyPrevious) => {
  return value.split(',');
};

const examples =
  `
  Examples:

    $ fun nas sync
    $ fun nas sync -s nas_demo_service
    $ fun nas sync -s nas_demo_service -m /mnt/auto
  `;

program
  .name('fun nas sync')
  .usage('[options]')
  .description('Upload local NAS to remote NAS automatically')
  .option('-s, --service <service-name>', 'Upload the local NAS belonging to the specified service')
  .option('-m, --mount-dir <mount-dirs>', 'Upload the local NAS corresponding to the specified mount directory', commaSeparatedList)
  .on('--help', () => {
    console.log(examples);
  })
  .parse(process.argv);

program.parse(process.argv);

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/nas/sync').send();

  require('../lib/commands/nas/sync')(program)
    .then(() => {
      visitor.event({
        ec: 'sync',
        ea: 'sync',
        el: 'success',
        dp: '/fun/nas/sync'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'sync',
        ea: 'sync',
        el: 'error',
        dp: '/fun/nas/sync'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});
