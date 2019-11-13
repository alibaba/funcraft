'use strict';

const path = require('path'),
  expect = require('expect.js'),
  ignore = require('../../lib/package/ignore');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const fs = require('fs-extra');

describe('funignore', async () => {

  it('default ignore', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(path.join(__dirname, '.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.svn'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.git'))).to.be.ok();

    expect(funignore(path.join(__dirname, '/abc/.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '/abc/ddd/.env'))).to.be.ok();

  });

  it('from .funignore', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(path.join(__dirname, '1.log'))).to.be.ok();
    expect(funignore(path.join(__dirname, '1.log1'))).not.to.be.ok();
    expect(funignore(path.join(__dirname, 'node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'aa/node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'bb/node_modules'))).not.to.be.ok();

  });

  it('empty path', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(__dirname)).not.to.be.ok();
  });

  it('unignore env', async () => {
    var baseDir = path.join(__dirname, 'unignore');
    var funignore = await ignore(baseDir);

    expect(funignore(path.join(baseDir, '.env'))).not.to.be.ok();
  });

});

describe('test funignore with nasMappings.json', () => {
  const baseDir = path.join(__dirname);

  const content = {
    'MyService': [
      {
        'localNasDir': `${baseDir}/java`,
        'remoteNasDir': '/mnt/auto/root'
      },
      {
        'localNasDir': `${baseDir}/node_modules`,
        'remoteNasDir': '/mnt/auto/node_modules'
      }
    ]
  };

  beforeEach(() => {
    sandbox.stub(fs, 'pathExists').resolves(true);
    sandbox.stub(fs, 'readFile').resolves(JSON.stringify(content));
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('test nasMappings.json', async () => {

    const funignore = await ignore(baseDir);

    expect(funignore(path.join(baseDir, '.fun', 'nasMappings.json'))).to.be.ok();
    expect(funignore(path.join(baseDir, 'fun', '1.txt'))).not.to.be.ok();
    expect(funignore(path.join(baseDir, 'node_modules'))).to.be.ok();
    expect(funignore(path.join(baseDir, 'java'))).to.be.ok();
  });
});