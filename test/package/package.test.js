'use strict';

const path = require('path');
let pack = require('../../lib/package/package');
const template = require('../../lib/package/template');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const tpl = require('../../lib/tpl');
const client = require('../../lib/client');
const util = require('../../lib/import/utils');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;

describe('test package', () => {

  const tplPath = 'tplPath';
  const bucket = 'bucket';
  const outputTemplateFile = 'outputTemplateFile';
  const updatedTpl = 'updatedTpl';
  const tplContent = 'tplContent';

  let ossClient;
  
  beforeEach(() => {
    ossClient = sandbox.stub();

    sandbox.stub(tpl, 'getTpl').resolves(tplContent); 
    sandbox.stub(client, 'getOssClient').resolves(ossClient);
    sandbox.stub(template, 'uploadAndUpdateFunctionCode').resolves(updatedTpl);
    sandbox.stub(util, 'outputTemplateFile').returns();

    pack = proxyquire('../../lib/package/package', {
      '../tpl': tpl,
      '../client': client,
      'path': path
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test outputTemplateFile', async () => {
    const packedYmlPath = path.resolve(process.cwd(), outputTemplateFile);

    await pack.pack(tplPath, bucket, outputTemplateFile);

    assert.calledWith(tpl.getTpl, tplPath);
    assert.calledWith(client.getOssClient, bucket);
    assert.calledWith(template.uploadAndUpdateFunctionCode, path.dirname(tplPath), tplContent, ossClient);
    assert.calledWith(util.outputTemplateFile, packedYmlPath, updatedTpl);
  });

  it('test default outputTemplateFile', async () => {
    const packedYmlPath = path.resolve(process.cwd(), 'template.packaged.yml');

    await pack.pack(tplPath, bucket);

    assert.calledWith(tpl.getTpl, tplPath);
    assert.calledWith(client.getOssClient, bucket);
    assert.calledWith(template.uploadAndUpdateFunctionCode, path.dirname(tplPath), tplContent, ossClient);
    assert.calledWith(util.outputTemplateFile, packedYmlPath, updatedTpl);
  });
});