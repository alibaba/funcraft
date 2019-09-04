'use strict';

const template = require('../../lib/package/template');
const fs = require('fs-extra');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;
const zip = require('../../lib/package/zip');
const util = require('../../lib/package/util');
const path = require('path');
const tempDir = require('temp-dir');
const uuid = require('uuid');
const expect = require('expect.js');

describe('test uploadAndUpdateFunctionCode', () => {

  const bucket = 'bucket';
  const baseDir = 'baseDir';

  const absCodeUri = path.resolve(baseDir, 'php7.2/index.php');

  const tpl = {
    Resources: {
      localdemo: {
        Type: 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'php7.2/index.php',
            Description: 'Hello world with php7.2!',
            Runtime: 'php7.2'
          }
        }
      }
    }
  };

  const ossTpl = {
    Resources: {
      localdemo: {
        Type: 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'oss://bucket/test',
            Description: 'Hello world with php7.2!',
            Runtime: 'php7.2'
          }
        }
      }
    }
  };

  const updatedTpl = {
    'Resources': {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'php72': {
          'Properties': {
            'CodeUri': 'oss://bucket/localdemo/php72/md5',
            'Description': 'Hello world with php7.2!',
            'Handler': 'index.handler',
            'Runtime': 'php7.2'
          },
          'Type': 'Aliyun::Serverless::Function'
        }
      }
    }
  };

  let ossClient;

  beforeEach(() => {
    sandbox.stub(fs, 'pathExists').resolves(true);
    sandbox.stub(fs, 'ensureDir').resolves(true);
    sandbox.stub(zip, 'packTo').resolves(true);
    sandbox.stub(util, 'fileMD5').resolves('md5');
    sandbox.stub(fs, 'remove').resolves(true);
    sandbox.stub(fs, 'createReadStream').returns('zipcontent');
    sandbox.stub(uuid, 'v4').returns('random');

    ossClient.head.rejects({ name: 'NoSuchKeyError' });

    ossClient = {
      head: sandbox.stub(),
      put: sandbox.stub(),
      options: {
        bucket
      }
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test uploadAndUpdateFunctionCode with local code', async () => {
    const t = await template.uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);

    const randomDir = path.join(tempDir, 'random');
    const zipPath = path.join(randomDir, 'code.zip');

    assert.calledWith(fs.pathExists, absCodeUri);
    assert.calledWith(fs.ensureDir, randomDir);
    assert.calledWith(zip.packTo, absCodeUri, sinon.match.func, zipPath);
    assert.calledWith(util.fileMD5, sinon.match.string);
    assert.calledWith(ossClient.head, 'localdemo/php72/md5');
    assert.calledWith(ossClient.put, 'localdemo/php72/md5', 'zipcontent');
    assert.calledWith(fs.remove, randomDir);

    expect(t).to.eql(updatedTpl);
  });

  it('test uploadAndUpdateFunctionCode with oss code', async () => {
    const updatedTpl = await template.uploadAndUpdateFunctionCode(baseDir, ossTpl, ossClient);

    const randomDir = path.join(tempDir, 'random');

    assert.notCalled(fs.pathExists);
    assert.notCalled(fs.ensureDir);
    assert.notCalled(zip.packTo);
    assert.notCalled(util.fileMD5);
    assert.notCalled(ossClient.head);
    assert.notCalled(ossClient.put);
    assert.notCalled(fs.remove);

    expect(ossTpl).to.eql(updatedTpl);
  });


});