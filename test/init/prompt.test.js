'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  existsSync: sandbox.stub(),
  statSync: sandbox.stub(),
  readdirSync: sandbox.stub()
};

const rimraf = { sync: sandbox.stub() };

const inquirer = {
  prompt: sandbox.stub()
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
        userPrompt: [{ name: 'foo', default: 'bar'}, { name: 'baz', default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo' } 
    };
    await promptStub.promptForConfig(context);
    expect(context).to.eql({
      input: false, 
      config: { 
        userPrompt: [{ name: 'foo', default: 'bar'}, { name: 'baz', default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo', baz: 'foo' } 
    });
  });

  it('for config when input is true', async () => {
    const context = {
      input: true, 
      config: { 
        userPrompt: [{ name: 'foo', default: 'bar'}, { name: 'baz', default: 'foo'}] 
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
        userPrompt: [{ name: 'foo', default: 'bar'}, { name: 'baz', default: 'foo'}] 
      },
      vars: { bar: 'foo', foo: 'foo', baz: 'baz' } 
    });
  });

  it('for existing path when directory is empty', async () => {
    fs.existsSync.returns(true);
    fs.statSync.returns({ isDirectory: () => true });
    fs.readdirSync.returns([]);
    await promptStub.promptForExistingPath('foo', 'bar', true);

    sandbox.assert.notCalled(inquirer.prompt);
    sandbox.assert.calledOnce(fs.existsSync);
    sandbox.assert.notCalled(rimraf.sync);
  });

  it('for existing path when directory is not empty', async () => {
    fs.existsSync.returns(true);
    fs.statSync.returns({ isDirectory: () => true });
    fs.readdirSync.returns(['foo']);
    inquirer.prompt.returns(Promise.resolve({ ok: true }));
    await promptStub.promptForExistingPath('foo', 'bar', true);

    sandbox.assert.calledOnce(inquirer.prompt);
    sandbox.assert.calledOnce(fs.existsSync);
    sandbox.assert.calledOnce(rimraf.sync);

  });

  it('for existing path when directory does not exist', async () => {
    fs.existsSync.returns(false);
    inquirer.prompt.returns(Promise.resolve({ ok: true }));
    await promptStub.promptForExistingPath('foo', 'bar', true);

    sandbox.assert.notCalled(inquirer.prompt);
    sandbox.assert.calledOnce(fs.existsSync);
    sandbox.assert.notCalled(rimraf.sync);

  });

  it('for template', async () => {
    inquirer.prompt.returns(Promise.resolve({template: 'foo'}));
    const template = await promptStub.promptForTemplate([]);
    expect(template).to.be('foo');
  });

  it('for same function', async () => {
    inquirer.prompt.returns(Promise.resolve({function: 'service/function'}));
    const func = await promptStub.promptForFunctionSelection(['service/function', 'service1/function1']);
    expect(func).to.eql({
      serviceName: 'service',
      functionName: 'function'
    });
  });

  it('#test promptForDebugaHttptriggers with path', async () => {
    const httpTriggers = [{
      path: 'path',
      serviceName: 'serviceName',
      functionName: 'functionName'
    },
    {
      path: 'path1',
      serviceName: 'serviceName1',
      functionName: 'functionName1'
    }];
    inquirer.prompt.returns(Promise.resolve({function: 'path:serviceName/functionName'}));
    const func = await promptStub.promptForDebugaHttptriggers(httpTriggers);
    expect(func).to.eql({
      path: 'path',
      serviceName: 'serviceName',
      functionName: 'functionName'
    });
  });

  it('#test promptForDebugaHttptriggers without path', async () => {
    const httpTriggers = [{
      serviceName: 'serviceName',
      functionName: 'functionName'
    },
    {
      serviceName: 'serviceName1',
      functionName: 'functionName1'
    }];
    inquirer.prompt.returns(Promise.resolve({function: 'serviceName/functionName'}));
    const func = await promptStub.promptForDebugaHttptriggers(httpTriggers);
    expect(func).to.eql({
      path: undefined,
      serviceName: 'serviceName',
      functionName: 'functionName'
    });
  });
});