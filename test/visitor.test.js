'use strict';

let getVisitor = require('../lib/visitor').getVisitor;
const expect = require('expect.js');
const { setProcess } = require('./test-utils');
const os = require('os');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp-promise');
const fs = require('fs');
const util = require('util');
const yaml = require('js-yaml');
const proxyquire = require('proxyquire');
const writeFile = util.promisify(fs.writeFile);

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
    await mkdirp(`${os.homedir}/.fcli/`);
    await writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
      access_key_id: 'test'
    }));

    const fake = await getVisitor(true);

    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is false', async () => {
    await mkdirp(`${os.homedir}/.fcli/`);
    await writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
      report: false
    }));

    const fake = await getVisitor(true);
    expect(fake.pageview().send()).to.eql('fake');
    expect(fake.event().send()).to.eql('fake');
  });

  it('test report config is true', async () => {
    await mkdirp(`${os.homedir}/.fcli/`);
    await writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
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