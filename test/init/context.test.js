'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  readdirSync: sandbox.stub().returns(['bar', '{{ foo }}'])
};
const config = {
  getConfig: sandbox.stub().returns({ name: 'foo' })
};

const renderer = {
  renderContent: sandbox.stub().returns('foo')
};

const vcs = {
  makeSurePathExists: sandbox.stub()
};

const prompt = {
  promptForConfig: sandbox.stub(),
  promptForExistingPath: sandbox.stub()
};

const contextStub = proxyquire('../../lib/init/context', {
  './config': config,
  './renderer': renderer,
  './prompt': prompt,
  './vcs': vcs,
  'fs': fs
});

describe('context', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('build context', async () => {
    config.getConfig.returns({ name: 'foo' });
    const context = { name: 'foo', outputDir: '.', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      name: 'foo',
      outputDir: '.',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo' },
      vars: { projectName: 'foo' }
    });
  });


});