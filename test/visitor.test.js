'use strict';

let getVisitor = require('../lib/visitor').getVisitor;
const expect = require('expect.js');
const { setProcess } = require('./test-utils');
const os = require('os');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();

describe('test getVisitor', () => {
  
  let restoreProcess;
  beforeEach(() => {
    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });
  });

  afterEach(() => {
    rimraf.sync(`${os.homedir}/.fcli/`);
    restoreProcess();
    sandbox.restore();
  });

  it('test missing .fcli/config.yaml', async () => {

    const fake = await getVisitor();
  
    expect(fake.pageview().send()).to.eql('fakeMocha');
    expect(fake.event().send()).to.eql('fakeMocha');
  });

  it('test use fake when missing report config', async () => {
    await fs.mkdirp(`${os.homedir}/.fcli/`);
    await fs.writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
      access_key_id: 'test'
    }));

    const fake = await getVisitor(true);

    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is false', async () => {
    await fs.mkdirp(`${os.homedir}/.fcli/`);
    await fs.writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
      report: false
    }));

    const fake = await getVisitor(true);
    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is true', async () => {
    await fs.mkdirp(`${os.homedir}/.fcli/`);
    await fs.writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
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

    getVisitor = proxyquire('../lib/visitor', {
      'universal-analytics': uaMock
    }).getVisitor;

    const real = await getVisitor(true);

    expect(real.pageview()).to.eql('real');
  });
});