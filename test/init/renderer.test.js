'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const realYaml = require('js-yaml');

const sandbox = sinon.createSandbox();
const fs = {
  mkdirSync: sandbox.stub(),
  readdirSync: sandbox.stub(),
  writeFileSync: sandbox.stub(),
  statSync: sandbox.stub(),
  readFileSync: sandbox.stub(),
  createReadStream: sandbox.stub(),
  createWriteStream: sandbox.stub(),
  existsSync: sandbox.stub()

};

const path = {
  resolve: (a, b) => b,
  join: (a, b) => b,
  relative: (a, b) => b
};

const yaml = {
  safeDump: sandbox.stub()
};

const rendererStub = proxyquire('../../lib/init/renderer', {
  'fs': fs,
  'path': path,
  'js-yaml': yaml
});

const targetTemplate = `
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  test-service:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'helloworld'
    test-func:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: index.handler
        Runtime: nodejs6
`;

const sourceTemplate = `
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  test-service:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'helloworld'
    test-func:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Runtime: nodejs8
        CodeUri: 'index.js'
    test-func2:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Runtime: nodejs8
        CodeUri: 'index.js'
`;

const mergedTemplate = `
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  test-service:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'helloworld'
    test-func:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: index.handler
        Runtime: nodejs8
        CodeUri: 'index.js'
    test-func2:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Runtime: nodejs8
        CodeUri: 'index.js'
`;

describe('renderer', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('render', async () => {
    fs.readdirSync.withArgs('baz').returns(['foo', 'bar', 'abc']).withArgs('foo').returns([]);
    fs.createReadStream.returns({ pipe: () => {} });
    fs.statSync
      .withArgs('foo').returns({ isDirectory: () => true })
      .withArgs('bar').returns({ isDirectory: () => false })
      .withArgs('cba').returns({ isDirectory: () => false })
      .withArgs('abc').returns({ isDirectory: () => false });
    fs.readFileSync.returns('test {{ foo }}');
    rendererStub.render({ repoDir: 'foor', templateDir: 'baz', vars: { foo: 'bar' }, config: { copyOnlyPaths: 'abc', ignorePaths: 'cba' } });
    sandbox.assert.calledWith(fs.mkdirSync, 'foo');
    sandbox.assert.calledWith(fs.writeFileSync, 'bar', 'test bar');
    sandbox.assert.neverCalledWith(fs.writeFileSync, 'cba', 'test bar');
    sandbox.assert.calledOnce(fs.writeFileSync);
    sandbox.assert.calledOnce(fs.createReadStream);
    sandbox.assert.calledWith(fs.createReadStream, 'abc');
    sandbox.assert.calledOnce(fs.createWriteStream);
    sandbox.assert.calledWith(fs.createWriteStream, 'abc');
  });

  it('render when merge is true', async () => {
    fs.readdirSync.withArgs('baz').returns(['template.yml']);
    fs.existsSync.returns(true);
    fs.statSync
      .withArgs('template.yml').returns({ isDirectory: () => false });
    fs.readFileSync.onFirstCall().returns(sourceTemplate).onSecondCall().returns(targetTemplate);
    rendererStub.render({ repoDir: 'for', merge: true, templateDir: 'baz', vars: { }, config: {} });
    sandbox.assert.calledOnce(yaml.safeDump);
    sandbox.assert.calledWith(yaml.safeDump, realYaml.safeLoad(mergedTemplate));
  });

});