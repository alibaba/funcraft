'use strict';

// let getVisitor = require('../lib/visitor').getVisitor;
const expect = require('expect.js');
const { setProcess } = require('./test-utils');
const os = require('os');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const decache = require('decache');

describe('test getVisitor', () => {
  
  let restoreProcess;
  beforeEach(() => {
    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });
  });

  afterEach(() => {
    rimraf.sync(`${process.env.HOME}/.fcli/`);
    restoreProcess();
    sandbox.restore();
  });

  it('test missing .fcli/config.yaml', async () => {

    decache('../lib/visitor');
    let getVisitor = require('../lib/visitor').getVisitor;
    const fake = await getVisitor();
  
    expect(fake.pageview().send()).to.eql('fakeMocha');
    expect(fake.event().send()).to.eql('fakeMocha');
  });

  it('test use fake when missing report config', async () => {
    await fs.mkdirp(`${process.env.HOME}/.fcli/`);
    await fs.writeFile(`${process.env.HOME}/.fcli/config.yaml`, yaml.dump({
      access_key_id: 'test'
    }));

    decache('../lib/visitor');
    let getVisitor = require('../lib/visitor').getVisitor;
    const fake = await getVisitor(true);

    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is false', async () => {
    await fs.mkdirp(`${process.env.HOME}/.fcli/`);
    await fs.writeFile(`${process.env.HOME}/.fcli/config.yaml`, yaml.dump({
      report: false
    }));

    decache('../lib/visitor');
    let getVisitor = require('../lib/visitor').getVisitor;
    const fake = await getVisitor(true);

    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is true', async () => {
    await fs.mkdirp(`${process.env.HOME}/.fcli/`);
    await fs.writeFile(`${process.env.HOME}/.fcli/config.yaml`, yaml.dump({
      report: true
    }));
    
    function uaMock() {
      return {
        pageview: () => {
          return 'real';
        },
        set: () => {

        }
      };
    }

    decache('../lib/visitor');
    let getVisitor = proxyquire('../lib/visitor', {
      'universal-analytics': uaMock
    }).getVisitor;

    const real = await getVisitor(true);

    expect(real.pageview()).to.eql('real');
  });
});