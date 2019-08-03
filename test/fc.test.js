'use strict';

const FC = require('@alicloud/fc2');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const proxyquire = require('proxyquire');
const { setProcess } = require('./test-utils');
const zip = require('../lib/package/zip');
let fc = require('../lib/fc');
const path = require('path');
const fs = require('fs-extra');
const expect = require('expect.js');

describe('test getFunCodeAsBase64', () => {

  let restoreProcess;

  beforeEach(async () => {

    sandbox.stub(zip, 'pack').resolves({});

    sandbox.stub(fs, 'lstat').resolves({
      isFile: function () { return false; }
    });

    sandbox.stub(fs, 'readFile').resolves('test');

    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('test getFunCodeAsBase64: codeUri outside baseDir', async () => {
    await fc.getFunCodeAsBase64('/a/b', '/a');
    assert.calledWith(fs.lstat, '/a');
    assert.calledWith(zip.pack, '/a', null);
  });


  it('test getFunCodeAsBase64: codeUri outside baseDir2', async () => {
    await fc.getFunCodeAsBase64('/a/b', '../');
    assert.calledWith(fs.lstat, '../');
    assert.calledWith(zip.pack, '../', null);
  });

  it('test getFunCodeAsBase64: codeUri within baseDir', async () => {
    await fc.getFunCodeAsBase64('/a/b', '/a/b/c');
    assert.calledWith(fs.lstat, '/a/b/c');
    assert.calledWith(zip.pack, '/a/b/c', sinon.match.func);
  });


  it('test getFunCodeAsBase64: absolute codeUri path', async () => {
    await fc.getFunCodeAsBase64('/a/b', process.cwd() + '/a/b/c/index.js');
    assert.calledWith(fs.lstat, process.cwd() + '/a/b/c/index.js');
    assert.calledWith(zip.pack, process.cwd() + '/a/b/c/index.js', null);
  });

  it('test getFunCodeAsBase64: relative codeUri path', async () => {
    await fc.getFunCodeAsBase64('/a/b', './index.js');
    assert.calledWith(fs.lstat, './index.js');
    assert.calledWith(zip.pack, './index.js', null);
  });

  it('test getFunCodeAsBase64: relative codeUri for war', async () => {
    const content = await fc.getFunCodeAsBase64('/a/b', './web.war');
    expect(content).to.eql({ base64: Buffer.from('test').toString('base64') });

    assert.calledWith(fs.readFile, './web.war');

  });
});

describe('Incorrect environmental variables', () => {
  let restoreProcess;

  beforeEach(async () => {
    sandbox.stub(FC.prototype, 'getFunction').resolves({});
    sandbox.stub(FC.prototype, 'updateFunction').resolves({});
    sandbox.stub(zip, 'pack').resolves({});

    fc = await proxyquire('../lib/fc', {
      './package/zip': zip,
      '@alicloud/fc2': FC
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET',
      DEFAULT_REGION: 'cn-shanghai'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('should cast env value to String', async () => {
    await fc.makeFunction(path.join('examples', 'local'), {
      serviceName: 'localdemo',
      functionName: 'nodejs6',
      description: 'Hello world with nodejs6!',
      handler: 'index.handler',
      initializer: null,
      timeout: 3,
      initializationTimeout: 3,
      memorySize: 128,
      runtime: 'nodejs6',
      codeUri: path.join('examples', 'local', 'nodejs6'),
      environmentVariables: { 'StringTypeValue1': 123, 'StringTypeValue2': 'test' }
    });

    assert.calledWith(
      FC.prototype.updateFunction,
      'localdemo',
      'nodejs6',
      {
        description: 'Hello world with nodejs6!',
        handler: 'index.handler',
        initializer: null,
        timeout: 3,
        initializationTimeout: 3,
        memorySize: 128,
        runtime: 'nodejs6',
        code: {
          zipFile: undefined
        },
        environmentVariables: {
          StringTypeValue1: '123',
          StringTypeValue2: 'test',
          LD_LIBRARY_PATH: '/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
          PATH: '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
          PYTHONUSERBASE: '/code/.fun/python'
        }
      });
  });
});
