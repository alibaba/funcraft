'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  existsSync: sandbox.stub(),
  readFileSync: sandbox.stub()
};
const renderer = {
  renderContent: sandbox.stub()
};

const configStub = proxyquire('../../lib/init/config', {
  './renderer': renderer,
  'fs': fs
});

describe('get config', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('without config file', async () => {
    fs.existsSync.returns(false);
    expect(configStub.getConfig({repoDir: 'foo'})).to.eql({});
  });

  it('with config file', async () => {
    fs.existsSync.returns(true);
    renderer.renderContent.returns('{}');
    expect(configStub.getConfig).withArgs({repoDir: 'foo'}).to.not.throwException();
  });

  it('with config file', async () => {
    fs.existsSync.returns(true);
    renderer.renderContent.returns('{}');
    expect(configStub.getConfig).withArgs({repoDir: 'foo'}).to.not.throwException();
  });

  it('with illegal json format', async () => {
    fs.existsSync.returns(true);
    renderer.renderContent.returns('foo');
    expect(configStub.getConfig).withArgs({repoDir: 'foo'}).to.throwException();
  });

  it('with legal json format', async () => {
    fs.existsSync.returns(true);
    renderer.renderContent.returns(`{"name": "foo", "userPrompt": [{ "type": "input", "name": "bar" }]}`);
    expect(configStub.getConfig({repoDir: 'foo'})).to.eql({'name': 'foo', 'userPrompt': [{ 'type': 'input', 'name': 'bar' }]});
  });

  it('with illegal js format', async () => {
    fs.existsSync.returns(true);
    renderer.renderContent.returns('let foo = bar');
    expect(configStub.getConfig).withArgs({repoDir: 'foo'}).to.throwException();
  });

  it('with legal js format', async () => {
    fs.existsSync.onSecondCall().returns(true);
    renderer.renderContent.returns(`module.exports={"name": "foo", "userPrompt": [{ "type": "input", "name": "bar" }]}`);
    expect(configStub.getConfig({repoDir: 'foo'})).to.eql({'name': 'foo', 'userPrompt': [{ 'type': 'input', 'name': 'bar' }]});
  });

  it('with legal js function format', async () => {
    fs.existsSync.onSecondCall().returns(true);
    renderer.renderContent.returns(`module.exports={"name": "foo", "userPrompt": [{ "type": "input", "name": "bar", "when": () => { return true; } }]}`);
    const config = configStub.getConfig({repoDir: 'foo'});
    expect(config.userPrompt[0].when()).to.be(true);
  });


});