'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();

const repository = {
  determineRepoDir: sandbox.stub(),
  getOfficialTemplates: sandbox.stub()
};
const renderer = {
  render: sandbox.stub()
};
const prompt = {
  promptForTemplate: sandbox.stub()
};
const context = {
  buildContext: sandbox.stub()
};
const rimraf = {
  sync: sandbox.stub()
};

const initStub = proxyquire('../../lib/commands/init', {
  '../init/repository': repository,
  '../init/renderer': renderer,
  '../init/prompt': prompt,
  '../init/context': context,
  'rimraf': rimraf
});
describe('init', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('with location is empty', async () => {
    repository.getOfficialTemplates.returns({ foo: 'baz', bar: 'abc' });
    prompt.promptForTemplate.returns(Promise.resolve('foo'));
    repository.determineRepoDir.returns(Promise.resolve({ repoDir: 'foo', clean: true }));
    const c = {};
    await initStub(c);
    sandbox.assert.calledOnce(repository.getOfficialTemplates);
    sandbox.assert.calledOnce(prompt.promptForTemplate);
    sandbox.assert.calledOnce(renderer.render);
    sandbox.assert.calledOnce(repository.determineRepoDir);
    sandbox.assert.calledOnce(context.buildContext);
    sandbox.assert.calledOnce(rimraf.sync);
    expect(c).to.eql({
      templates: { foo: 'baz', bar: 'abc' },
      location: 'foo'
    });

  });

  it('with location is not empty', async () => {
    repository.getOfficialTemplates.returns({ foo: 'baz', bar: 'abc' });
    repository.determineRepoDir.returns(Promise.resolve({ repoDir: 'foo', clean: false }));
    const c = { location: 'foo' };
    await initStub(c);
    sandbox.assert.calledOnce(repository.getOfficialTemplates);
    sandbox.assert.notCalled(prompt.promptForTemplate);
    sandbox.assert.calledOnce(renderer.render);
    sandbox.assert.calledOnce(repository.determineRepoDir);
    sandbox.assert.calledOnce(context.buildContext);
    sandbox.assert.notCalled(rimraf.sync);
    expect(c).to.eql({
      location: 'foo',
      templates: { foo: 'baz', bar: 'abc' }
    });

  });


});