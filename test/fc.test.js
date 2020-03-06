'use strict';

const zip = require('../lib/package/zip');
const path = require('path');
const fs = require('fs-extra');
const util = require('../lib/import/utils');
const yaml = require('js-yaml');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const proxyquire = require('proxyquire');

let fc = require('../lib/fc');
const FC = require('@alicloud/fc2');

const { green } = require('colors');
const { setProcess } = require('./test-utils');
const { tplWithNasAuto, tplWithTheSameCodeUriAndRuntime } = require('./tpl-mock-data');

const tplPath = 'tplPath';
const baseDir = path.resolve(path.dirname(tplPath));

describe('test zipCode', () => {

  let restoreProcess;

  beforeEach(async () => {

    sandbox.stub(zip, 'pack').resolves({});

    sandbox.stub(fs, 'lstat').resolves({
      isFile: function () { return false; }
    });

    sandbox.stub(fs, 'stat').resolves({
      size: '100'
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

  it('test zipCode: codeUri outside baseDir', async () => {
    await fc.zipCode('/a/b', '/a');
    assert.calledWith(fs.lstat, path.resolve('/a'));
    assert.calledWith(zip.pack, path.resolve('/a'), null);
  });


  it('test zipCode: codeUri outside baseDir2', async () => {
    await fc.zipCode('/a/b', '../');
    assert.calledWith(fs.lstat, path.resolve('/a'));
    assert.calledWith(zip.pack, path.resolve('/a'), null);
  });

  it('test zipCode: codeUri within baseDir', async () => {
    await fc.zipCode('/a/b', '/a/b/c');
    assert.calledWith(fs.lstat, path.resolve('/a/b/c'));
    assert.calledWith(zip.pack, path.resolve('/a/b/c'), sinon.match.func);
  });


  it('test zipCode: absolute codeUri path', async () => {
    await fc.zipCode('/a/b', '/a/b/c/index.js');
    assert.calledWith(fs.lstat, path.resolve('/a/b/c/index.js'));
    assert.calledWith(zip.pack, path.resolve('/a/b/c/index.js'), sinon.match.func);
  });

  it('test zipCode: relative codeUri path', async () => {
    await fc.zipCode('/a/b', './index.js');
    assert.calledWith(fs.lstat, path.resolve('/a/b/index.js'));
    assert.calledWith(zip.pack, path.resolve('/a/b/index.js'), sinon.match.func);
  });

  it('test zipCode: relative codeUri for war', async () => {
    const content = await fc.zipCode('/a/b', './web.war');
    expect(content).to.eql({
      base64: Buffer.from('test').toString('base64'),
      compressedSize: '100'
    });

    assert.calledWith(fs.readFile, path.resolve('/a/b/web.war'));
  });
});

describe('Incorrect environmental variables', () => {
  let restoreProcess;

  beforeEach(async () => {
    sandbox.stub(FC.prototype, 'getFunction').resolves({});
    sandbox.stub(FC.prototype, 'updateFunction').resolves({});
    sandbox.stub(zip, 'pack').resolves({});

    sandbox.stub(console, 'log');

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
      codeUri: 'nodejs6',
      environmentVariables: { 'StringTypeValue1': 123, 'StringTypeValue2': 'test' }
    }, undefined, path.join('examples', 'local', 'template.yml'));

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
          LD_LIBRARY_PATH: '/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code/.fun/root/lib/x86_64-linux-gnu:/code/.fun/root/usr/lib64:/code:/code/lib:/usr/local/lib',
          PATH: '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
          NODE_PATH: '/code/node_modules:/usr/local/lib/node_modules',
          PYTHONUSERBASE: '/code/.fun/python'
        },
        instanceConcurrency: undefined
      });
  });

  it('invoke function sync', async () => {

    sandbox.stub(FC.prototype, 'invokeFunction').returns({
      'headers': {
        'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
        'content-length': '6',
        'content-type': 'application/octet-stream',
        'x-fc-code-checksum': '17380263816131011825',
        'x-fc-invocation-duration': '18',
        'x-fc-invocation-service-version': 'LATEST',
        'x-fc-log-result': 'RkMgSW52b2tlIFN0YXJ0IFJlcXVlc3RJZDogYWMyOTI2NGQtMDkwMC00ZjNkLWEwOWEtYmMzZGQyMmIyMzI1DQpsb2FkIGNvZGUgZm9yIGhhbmRsZXI6aW5kZXguaGFuZGxlcg0KRkMgSW52b2tlIEVuZCBSZXF1ZXN0SWQ6IGFjMjkyNjRkLTA5MDAtNGYzZC1hMDlhLWJjM2RkMjJiMjMyNQ0KCkR1cmF0aW9uOiAxNy40NSBtcywgQmlsbGVkIER1cmF0aW9uOiAxMDAgbXMsIE1lbW9yeSBTaXplOiAxMjggTUIsIE1heCBNZW1vcnkgVXNlZDogMzAuOTkgTUI=',
        'x-fc-max-memory-usage': '30.99',
        'x-fc-request-id': 'ac29264d-0900-4f3d-a09a-bc3dd22b2325',
        'date': 'Wed, 21 Aug 2019 03:09:03 GMT'
      },
      'data': '[\'OK\']'
    });
    const rs = await fc.invokeFunction({
      serviceName: 'serviceName', 
      functionName: 'functionName', 
      event: 'event', 
      invocationType: 'Sync'
    });

    assert.calledWith(FC.prototype.invokeFunction, 'serviceName', 'functionName', 'event', {
      'X-Fc-Log-Type': 'Tail',
      'X-Fc-Invocation-Type': 'Sync'
    });

    assert.callCount(console.log, 5);

    expect(rs).to.eql({
      'headers': {
        'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
        'content-length': '6',
        'content-type': 'application/octet-stream',
        'x-fc-code-checksum': '17380263816131011825',
        'x-fc-invocation-duration': '18',
        'x-fc-invocation-service-version': 'LATEST',
        'x-fc-log-result': 'RkMgSW52b2tlIFN0YXJ0IFJlcXVlc3RJZDogYWMyOTI2NGQtMDkwMC00ZjNkLWEwOWEtYmMzZGQyMmIyMzI1DQpsb2FkIGNvZGUgZm9yIGhhbmRsZXI6aW5kZXguaGFuZGxlcg0KRkMgSW52b2tlIEVuZCBSZXF1ZXN0SWQ6IGFjMjkyNjRkLTA5MDAtNGYzZC1hMDlhLWJjM2RkMjJiMjMyNQ0KCkR1cmF0aW9uOiAxNy40NSBtcywgQmlsbGVkIER1cmF0aW9uOiAxMDAgbXMsIE1lbW9yeSBTaXplOiAxMjggTUIsIE1heCBNZW1vcnkgVXNlZDogMzAuOTkgTUI=',
        'x-fc-max-memory-usage': '30.99',
        'x-fc-request-id': 'ac29264d-0900-4f3d-a09a-bc3dd22b2325',
        'date': 'Wed, 21 Aug 2019 03:09:03 GMT'
      },
      'data': '[\'OK\']'
    });
  });

  it('invoke function async', async () => {

    sandbox.stub(FC.prototype, 'invokeFunction').returns({
      'headers': {
        'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
        'content-length': '6',
        'content-type': 'application/octet-stream',
        'x-fc-code-checksum': '17380263816131011825',
        'x-fc-invocation-duration': '18',
        'x-fc-invocation-service-version': 'LATEST',
        'x-fc-log-result': 'RkMgSW52b2tlIFN0YXJ0IFJlcXVlc3RJZDogYWMyOTI2NGQtMDkwMC00ZjNkLWEwOWEtYmMzZGQyMmIyMzI1DQpsb2FkIGNvZGUgZm9yIGhhbmRsZXI6aW5kZXguaGFuZGxlcg0KRkMgSW52b2tlIEVuZCBSZXF1ZXN0SWQ6IGFjMjkyNjRkLTA5MDAtNGYzZC1hMDlhLWJjM2RkMjJiMjMyNQ0KCkR1cmF0aW9uOiAxNy40NSBtcywgQmlsbGVkIER1cmF0aW9uOiAxMDAgbXMsIE1lbW9yeSBTaXplOiAxMjggTUIsIE1heCBNZW1vcnkgVXNlZDogMzAuOTkgTUI=',
        'x-fc-max-memory-usage': '30.99',
        'x-fc-request-id': 'ac29264d-0900-4f3d-a09a-bc3dd22b2325',
        'date': 'Wed, 21 Aug 2019 03:09:03 GMT'
      },
      'data': '[\'OK\']'
    });
    const rs = await fc.invokeFunction({
      serviceName: 'serviceName', 
      functionName: 'functionName', 
      event: 'event', 
      invocationType: 'Async'
    });

    assert.calledWith(FC.prototype.invokeFunction, 'serviceName', 'functionName', 'event', {
      'X-Fc-Invocation-Type': 'Async'
    });

    assert.calledWith(console.log, green('✔ ') + 'serviceName/functionName async invoke success.');

    expect(rs).to.eql({
      'headers': {
        'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
        'content-length': '6',
        'content-type': 'application/octet-stream',
        'x-fc-code-checksum': '17380263816131011825',
        'x-fc-invocation-duration': '18',
        'x-fc-invocation-service-version': 'LATEST',
        'x-fc-log-result': 'RkMgSW52b2tlIFN0YXJ0IFJlcXVlc3RJZDogYWMyOTI2NGQtMDkwMC00ZjNkLWEwOWEtYmMzZGQyMmIyMzI1DQpsb2FkIGNvZGUgZm9yIGhhbmRsZXI6aW5kZXguaGFuZGxlcg0KRkMgSW52b2tlIEVuZCBSZXF1ZXN0SWQ6IGFjMjkyNjRkLTA5MDAtNGYzZC1hMDlhLWJjM2RkMjJiMjMyNQ0KCkR1cmF0aW9uOiAxNy40NSBtcywgQmlsbGVkIER1cmF0aW9uOiAxMDAgbXMsIE1lbW9yeSBTaXplOiAxMjggTUIsIE1heCBNZW1vcnkgVXNlZDogMzAuOTkgTUI=',
        'x-fc-max-memory-usage': '30.99',
        'x-fc-request-id': 'ac29264d-0900-4f3d-a09a-bc3dd22b2325',
        'date': 'Wed, 21 Aug 2019 03:09:03 GMT'
      },
      'data': '[\'OK\']'
    });
  });
});


describe('test processNasAutoConfiguration', ()=> {
  let restoreProcess;

  const serviceName = 'localdemo';
  const functionName = 'python3';
  const runtime = tplWithNasAuto.Resources.localdemo.python3.Properties.Runtime;
  const codeUri = tplWithNasAuto.Resources.localdemo.python3.Properties.CodeUri;

  const localSystemDependency = path.resolve(codeUri, path.join('.fun', 'root'));
  const nasYmlPath = path.resolve(baseDir, '.nas.yml');

  let pathExistsStub;
  let safeLoadStub;

  beforeEach(async () => {

    pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(localSystemDependency).resolves(true);
    pathExistsStub.withArgs(nasYmlPath).resolves(false);

    safeLoadStub = sandbox.stub(yaml, 'safeLoad');
    sandbox.stub(fs, 'writeFile');
    sandbox.stub(fs, 'readFileSync');
    sandbox.stub(util, 'outputTemplateFile');

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

  it('# nas auto-configuration fot fun package.', async () => {
    safeLoadStub.returns(tplWithNasAuto);
    const stage = 'package';
    const tplChanged = await fc.processNasAutoConfiguration({ tpl: tplWithNasAuto, tplPath, runtime, codeUri, stage,
      serviceName,
      functionName
    });

    expect(tplChanged).to.be(false);
  });

  it('# test processNasMappingsAndEnvs', async () => {
    const localDir = path.relative(baseDir, path.join(codeUri, '.fun/python'));
    pathExistsStub.withArgs(localDir).resolves(true);

    safeLoadStub.returns(tplWithNasAuto);

    const { tplChanged, remoteNasDirPrefix, updatedTpl } = await fc.processNasMappingsAndEnvs({ tpl: tplWithNasAuto,
      tplPath, runtime,
      codeUri, baseDir,
      serviceName, functionName
    });

    const functionProp = tplWithNasAuto.Resources.localdemo.python3.Properties;
    functionProp.EnvironmentVariables = {
      'LD_LIBRARY_PATH': '/mnt/auto/root/usr/lib:/mnt/auto/root/usr/lib/x86_64-linux-gnu:/mnt/auto/root/lib/x86_64-linux-gnu:/mnt/auto/root/usr/lib64',
      'PYTHONUSERBASE': '/mnt/auto/python'
    };

    expect(tplChanged).to.eql(false);
    expect(remoteNasDirPrefix).to.eql('/mnt/auto/');
    expect(updatedTpl).to.eql(tplWithNasAuto);
  });

  it('# test processNasMappingsAndEnvs with the same codeUri and runtime of funtions under a service fot fun package', async () => {

    safeLoadStub.returns(tplWithTheSameCodeUriAndRuntime);

    const functionName = 'fun1';
    const runtime = tplWithTheSameCodeUriAndRuntime.Resources.localdemo.fun1.Properties.Runtime;
    const codeUri = tplWithTheSameCodeUriAndRuntime.Resources.localdemo.fun2.Properties.CodeUri;
    const absCodeUri = path.resolve(baseDir, codeUri);

    const localSystemDependency = path.resolve(codeUri, path.join('.fun', 'root'));
    const nasYmlPath = path.resolve(baseDir, '.nas.yml');
    const localDir = path.relative(baseDir, path.join(codeUri, 'node_modules'));

    pathExistsStub.withArgs(localDir).resolves(true);
    pathExistsStub.withArgs(localSystemDependency).resolves(true);
    pathExistsStub.withArgs(nasYmlPath).resolves(false);

    const { tplChanged, remoteNasDirPrefix, updatedTpl } = await fc.processNasMappingsAndEnvs({ tpl: tplWithTheSameCodeUriAndRuntime,
      tplPath, runtime, baseDir,
      codeUri: absCodeUri,
      serviceName, functionName
    });

    const envs = {
      'LD_LIBRARY_PATH': '/mnt/auto/root/usr/lib:/mnt/auto/root/usr/lib/x86_64-linux-gnu:/mnt/auto/root/lib/x86_64-linux-gnu:/mnt/auto/root/usr/lib64',
      'NODE_PATH': '/mnt/auto/node_modules:/usr/local/lib/node_modules'
    };

    const functionProp_1 = tplWithTheSameCodeUriAndRuntime.Resources.localdemo.fun1.Properties;
    const functionProp_2 = tplWithTheSameCodeUriAndRuntime.Resources.localdemo.fun2.Properties;

    functionProp_1.EnvironmentVariables = envs;
    functionProp_2.EnvironmentVariables = envs;

    expect(tplChanged).to.be.eql(true);
    expect(remoteNasDirPrefix).to.be.eql('/mnt/auto/');
    expect(updatedTpl).to.be.eql(tplWithTheSameCodeUriAndRuntime);
  });
});