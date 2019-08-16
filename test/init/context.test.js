'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  readdirSync: sandbox.stub(),
  ensureDir: sandbox.stub()
};
const config = {
  getConfig: sandbox.stub()
};

const renderer = {
  renderContent: sandbox.stub()
};

const prompt = {
  promptForConfig: sandbox.stub(),
  promptForExistingPath: sandbox.stub()
};

const contextStub = proxyquire('../../lib/init/context', {
  './config': config,
  './renderer': renderer,
  './prompt': prompt,
  'fs-extra': fs
});

describe('context', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('build context', async () => {
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    renderer.renderContent.returns('foo');
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

  it('build context when name is empty', async () => {
    config.getConfig.returns({ name: 'foo' });
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: 'foo/bar', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: 'foo',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo' },
      vars: { projectName: 'bar' }
    });
  });

  it('build context when output-dir is /', async () => {
    config.getConfig.returns({ name: 'foo' });
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: '/', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: '/',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo' },
      vars: { projectName: 'fun-app' }
    });
  });

  it('build context when copyOnlyPaths is foo', async () => { 
    config.getConfig.returns({ name: 'foo', copyOnlyPaths: 'foo'});
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: '/', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: '/',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo', copyOnlyPaths: 'foo'},
      vars: { projectName: 'fun-app' }
    });
  });

  it('build context when copyOnlyPaths is ["foo", "bar"]', async () => { 
    config.getConfig.returns({ name: 'foo', copyOnlyPaths: ['foo', 'bar']});
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: '/', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: '/',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo', copyOnlyPaths: 'foo\nbar'},
      vars: { projectName: 'fun-app' }
    });
  });

  it('build context when ignorePaths is foo', async () => { 
    config.getConfig.returns({ name: 'foo', ignorePaths: 'foo'});
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: '/', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: '/',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo', ignorePaths: 'foo'},
      vars: { projectName: 'fun-app' }
    });
  });

  it('build context when ignorePaths is ["foo", "bar"]', async () => { 
    config.getConfig.returns({ name: 'foo', ignorePaths: ['foo', 'bar']});
    renderer.renderContent.returns('foo');
    fs.readdirSync.returns(['bar', '{{ foo }}']);
    const context = {outputDir: '/', vars: {}};
    await contextStub.buildContext('foo', context);
    expect(context).to.eql({
      outputDir: '/',
      repoDir: 'foo',
      templateDir: '{{ foo }}',
      config: { name: 'foo', ignorePaths: 'foo\nbar'},
      vars: { projectName: 'fun-app' }
    });
  });



});