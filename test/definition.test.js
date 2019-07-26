'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');

const definition = require('../lib/definition');
const prompt = require('../lib/init/prompt');

const proxyquire = require('proxyquire');

const { tpl, tplWithDuplicatedFunction} = require('./tpl-mock-data');

describe('test findFunctionByServiceAndFunctionName', () => {

  it('test find by service name and funtion name', () => {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo', 'python3', tpl);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');

    expect(serviceRes).to.eql(tpl.Resources.localdemo);
    expect(functionRes).to.eql(tpl.Resources.localdemo.python3);
  });

  it('test find by funtion name', async function () {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(null, 'python3', tpl);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tpl.Resources.localdemo);
    expect(functionRes).to.eql(tpl.Resources.localdemo.python3);
  });

  it('test find not found', async function () {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(null, 'python4', tpl);

    expect(serviceName).to.be(undefined);
    expect(functionName).to.be(undefined);
    expect(serviceRes).to.be(undefined);
    expect(functionRes).to.eql(undefined);
  });

  it('test find by service name and function name in duplicated function', async function () {

    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo', 'python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo.python3);
  });

  it('test find anonther by service name and function name in duplicated function', async () => {
    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo2', 'python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo2');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo2);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo2.python3);
  });

  it('test find by function name in duplicated function', async function () {

    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(null, 'python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo.python3);
  });

  it('test matching service by sourceName', async function () {

    let {serviceName, serviceRes} = await definition.matchingFuntionUnderServiceBySourceName('localdemo', tpl.Resources);

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tpl.Resources.localdemo);
  });

  it('test matching function by sourceName', async function () {

    let {serviceName, serviceRes} = await definition.matchingFuntionUnderServiceBySourceName('python3', tpl.Resources);

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tpl.Resources.localdemo);
  });

  it('test find certain function by service and functionName', async function () {

    let {serviceName, serviceRes} = await definition.findServiceByCertainServiceAndFunctionName(tpl.Resources, 'localdemo', 'python3' );

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tpl.Resources.localdemo);
  });

  it('test find certain function by service and functionName on duplicated function', async function () {

    let {serviceName, serviceRes} = await definition.findServiceByCertainServiceAndFunctionName(tplWithDuplicatedFunction.Resources, 'localdemo2', 'python3' );

    expect(serviceName).to.be('localdemo2');
    expect(serviceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo2);
  });
});

describe('test matching function', () => {

  beforeEach(() => {

    Object.keys(prompt).forEach(m => {
      if (m === 'promptForSameFunction') {
        sandbox.stub(prompt, m).resolves('localdemo/python3');
      } else {
        sandbox.stub(prompt, m).resolves({});
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function matchingFuntion(sourceName, resources) {
    return await proxyquire('../lib/definition', {
      '../lib/init/prompt': prompt
    }).matchingFuntionUnderServiceBySourceName(sourceName, resources);
  }

  it('test matching function by sourceName on tpl with duplicated function', async () => {

    let {serviceName, serviceRes} = await matchingFuntion('python3', tplWithDuplicatedFunction.Resources);

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo);
  });
});

describe('test findNasConfigInService', () => {
  it('test could not find nas config in service', () => {
    const serviceRes = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Description': 'php local invoke demo'
        }
      }
    };

    const nasConfig = definition.findNasConfigInService(serviceRes);
    expect(nasConfig).to.be.null;
  });

  it('test find nas config in service', () => {
    const serviceRes = {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'php local invoke demo',
        'NasConfig': {}
      }
    };

    const nasConfig = definition.findNasConfigInService(serviceRes);
    expect(nasConfig).to.eql(serviceRes.Properties.NasConfig);
  });
});

describe('test findHttpTriggersInFunction', () => {
  const functionRes = {
    nodejs6: {
      Type: 'Aliyun::Serverless::Function'
    },
    python27: {
      Type: 'Aliyun::Serverless::Function',
      Events: {
        'http-test': {
          Type: 'HTTP'
        }
      }
    }
  };
  
  it('test normal', () => {
    const triggers = definition.findHttpTriggersInFunction(functionRes.python27);
    expect(triggers).to.be.eql([{
      triggerName: 'http-test',
      triggerRes: {
        Type: 'HTTP'
      }
    }]);
  });
});

module.exports = { tpl };
