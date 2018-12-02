'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();
const fs = {
  mkdirSync: sandbox.stub(),
  readdirSync: sandbox.stub(),
  writeFileSync: sandbox.stub(),
  statSync: sandbox.stub(),
  readFileSync: sandbox.stub(),
  createReadStream: sandbox.stub(),
  createWriteStream: sandbox.stub()

};

const path = {
  resolve: (a, b) => b,
  join: (a, b) => b,
  relative: (a, b) => b
};

const rendererStub = proxyquire('../../lib/init/renderer', {
  'fs': fs,
  'path': path
});

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
      .withArgs('abc').returns({ isDirectory: () => false });
    fs.readFileSync.returns('test {{ foo }}');
    rendererStub.render({ repoDir: 'foor', templateDir: 'baz', vars: { foo: 'bar' }, config: { copyOnlyPaths: 'abc' } });
    sandbox.assert.calledWith(fs.mkdirSync, 'foo');
    sandbox.assert.calledWith(fs.writeFileSync, 'bar', 'test bar');
    sandbox.assert.calledOnce(fs.writeFileSync);
    sandbox.assert.calledOnce(fs.createReadStream);
    sandbox.assert.calledWith(fs.createReadStream, 'abc');
    sandbox.assert.calledOnce(fs.createWriteStream);
    sandbox.assert.calledWith(fs.createWriteStream, 'abc');
  });


});