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

  const tplWithSameCodeUri = {
    Resources: {
      localdemo: {
        Type: 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: './',
            Description: 'Hello world with php7.2!',
            Runtime: 'php7.2'
          }
        },
        nodejs6: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: './',
            Description: 'Hello world with nodejs6!',
            Runtime: 'nodejs6'
          }
        },
        nodejs8: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'nodejs8/index.php',
            Description: 'Hello world with nodejs8!',
            Runtime: 'nodejs8'
          }
        }
      }
    }
  };

  const updatedTplWithSameCodeUri = {
    Resources: {
      localdemo: {
        Type: 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'oss://bucket/md5',
            Description: 'Hello world with php7.2!',
            Runtime: 'php7.2'
          }
        },
        nodejs6: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'oss://bucket/md5',
            Description: 'Hello world with nodejs6!',
            Runtime: 'nodejs6'
          }
        },
        nodejs8: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'oss://bucket/md5',
            Description: 'Hello world with nodejs8!',
            Runtime: 'nodejs8'
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
            'CodeUri': 'oss://bucket/md5',
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
    sandbox.stub(util, 'md5').resolves('md5');
    sandbox.stub(fs, 'remove').resolves(true);
    sandbox.stub(fs, 'createReadStream').returns('zipcontent');
    sandbox.stub(uuid, 'v4').returns('random');

    ossClient = {
      head: sandbox.stub(),
      put: sandbox.stub(),
      options: {
        bucket
      }
    };

    ossClient.head.rejects({ name: 'NoSuchKeyError' });
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
    assert.calledWith(util.md5, sinon.match.string);
    assert.calledWith(ossClient.head, 'md5');
    assert.calledWith(ossClient.put, 'md5', 'zipcontent');
    assert.calledWith(fs.remove, randomDir);

    expect(t).to.eql(updatedTpl);
  });


  it('test uploadAndUpdateFunctionCode with local code and multiple same codeUri', async () => {
    const t = await template.uploadAndUpdateFunctionCode(baseDir, tplWithSameCodeUri, ossClient);

    const randomDir = path.join(tempDir, 'random');
    const zipPath = path.join(randomDir, 'code.zip');

    assert.callCount(fs.pathExists, 3);
    assert.calledWith(fs.ensureDir, randomDir);
    assert.calledTwice(zip.packTo);

    assert.calledWith(zip.packTo, path.resolve(baseDir, './'), sinon.match.func, zipPath);
    assert.calledWith(util.md5, sinon.match.string);
    assert.calledWith(ossClient.head, 'md5');

    assert.calledTwice(ossClient.put);
    assert.calledWith(ossClient.put, 'md5', 'zipcontent');

    assert.calledWith(fs.remove, randomDir);

    expect(t).to.eql(updatedTplWithSameCodeUri);
  });

  it('test uploadAndUpdateFunctionCode with oss code', async () => {
    const updatedTpl = await template.uploadAndUpdateFunctionCode(baseDir, ossTpl, ossClient);

    assert.notCalled(fs.pathExists);
    assert.notCalled(fs.ensureDir);
    assert.notCalled(zip.packTo);
    assert.notCalled(util.md5);
    assert.notCalled(ossClient.head);
    assert.notCalled(ossClient.put);
    assert.notCalled(fs.remove);

    expect(ossTpl).to.eql(updatedTpl);
  });
});