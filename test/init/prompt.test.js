'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  existsSync: sandbox.stub()
};

const rimraf = { sync: sandbox.stub() };

const inquirer = {
  prompt: sandbox.stub(),
};

const promptStub = proxyquire('../../lib/init/prompt', {
  'rimraf': rimraf,
  'inquirer': inquirer,
  'fs': fs
});

describe('prompt', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('for config when userPrompt is empty', async () => {
    const context = { config: {} };
    await promptStub.promptForConfig(context);
    expect(context).to.eql({
      config: {}
    });
  });

  it('for config when input is false', async () => {
    const context = {
      input: false, 
      config: { 
        userPrompt: [{ name: 'foo',  default: 'bar'}, { name: 'baz',  default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo' } 
    };
    await promptStub.promptForConfig(context);
    expect(context).to.eql({
      input: false, 
      config: { 
        userPrompt: [{ name: 'foo',  default: 'bar'}, { name: 'baz',  default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo', baz: 'foo' } 
    });
  });

  it('for config when input is true', async () => {
    const context = {
      input: true, 
      config: { 
        userPrompt: [{ name: 'foo',  default: 'bar'}, { name: 'baz',  default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo' } 
    };
    inquirer.prompt.returns(Promise.resolve({
      baz: 'baz'
    }));
    await promptStub.promptForConfig(context);
    expect(context).to.eql({
      input: true, 
      config: { 
        userPrompt: [{ name: 'foo',  default: 'bar'}, { name: 'baz',  default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo', baz: 'baz' } 
    });
  });

  it('for existing path', async () => {
    fs.existsSync.returns(true);
    inquirer.prompt.returns(Promise.resolve({ okToDelete: true }));
    await promptStub.promptForExistingPath('foo', 'bar');

    sandbox.assert.calledOnce(inquirer.prompt);
    sandbox.assert.calledOnce(fs.existsSync);
    sandbox.assert.calledOnce(rimraf.sync);

  });

  it('for template', async () => {
    inquirer.prompt.returns(Promise.resolve({template: 'foo'}));
    const template = await promptStub.promptForTemplate([]);
    expect(template).to.be('foo');
  });

});