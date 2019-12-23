'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');

const definition = require('../lib/definition');
const prompt = require('../lib/init/prompt');

const proxyquire = require('proxyquire');

const { tpl, tplWithDuplicatedFunction, tplWithDuplicatedFunctionsInService } = require('./tpl-mock-data');

describe('test findFunctionByServiceAndFunctionName', () => {

  it('test find by service name and funtion name', () => {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo/python3', tpl);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');

    expect(serviceRes).to.eql(tpl.Resources.localdemo);
    expect(functionRes).to.eql(tpl.Resources.localdemo.python3);
  });

  it('test find by funtion name', async function () {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('python3', tpl);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tpl.Resources.localdemo);
    expect(functionRes).to.eql(tpl.Resources.localdemo.python3);
  });

  it('test find not found', async function () {

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('python4', tpl);

    expect(serviceName).to.be(undefined);
    expect(functionName).to.be(undefined);
    expect(serviceRes).to.be(undefined);
    expect(functionRes).to.eql(undefined);
  });

  it('test find by service name and function name in duplicated function', async function () {

    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo/python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo.python3);
  });

  it('test find anonther by service name and function name in duplicated function', async () => {
    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('localdemo2/python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo2');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo2);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo2.python3);
  });

  it('test find by function name in duplicated function', async function () {

    let {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl('python3', tplWithDuplicatedFunction);

    expect(serviceName).to.be('localdemo');
    expect(functionName).to.be('python3');
    expect(serviceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo);
    expect(functionRes).to.eql(tplWithDuplicatedFunction.Resources.localdemo.python3);
  });

  it('test matching service by sourceName', async function () {

    let {resourceName, resourceRes} = await definition.matchingResourceBySourceName(tpl.Resources, 'localdemo');

    expect(resourceName).to.be('localdemo');
    expect(resourceRes).to.be(tpl.Resources.localdemo);
  });

  it('test more than one function under a service', async function () {

    let {resourceName, resourceRes} = await definition.matchingResourceBySourceName(tplWithDuplicatedFunctionsInService.Resources, 'nodejs6');

    expect(resourceName).to.be('localdemo');
    expect(resourceRes).to.eql(definition.deleteUnmatchFunctionsUnderServiceRes({
      serviceName: 'localdemo',
      serviceRes: tplWithDuplicatedFunctionsInService.Resources.localdemo,
      functionName: 'nodejs6'
    }));
  });

  it('test matching function by sourceName', async function () {

    let {resourceName, resourceRes} = await definition.matchingResourceBySourceName(tpl.Resources, 'python3');

    expect(resourceName).to.be('localdemo');
    expect(resourceRes).to.be(tpl.Resources.localdemo);
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

  it('test find certain function by service and functionName on duplicated function under a service', async function () {

    let {serviceName, serviceRes} = await definition.findServiceByCertainServiceAndFunctionName(tplWithDuplicatedFunctionsInService.Resources, 'localdemo', 'python3' );

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.eql(tpl.Resources.localdemo);
  });

});

describe('test matching function', () => {

  beforeEach(() => {

    Object.keys(prompt).forEach(m => {
      if (m === 'promptForFunctionSelection') {
        sandbox.stub(prompt, m).resolves({
          serviceName: 'localdemo',
          functionName: 'python3'
        });
      } else {
        sandbox.stub(prompt, m).resolves({});
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function matchingFuntion(resources, sourceName) {
    return await proxyquire('../lib/definition', {
      '../lib/init/prompt': prompt
    }).matchingResourceBySourceName(resources, sourceName);
  }

  it('test matching function by sourceName on tpl with duplicated function', async () => {

    let {resourceName, resourceRes} = await matchingFuntion(tplWithDuplicatedFunction.Resources, 'python3');

    expect(resourceName).to.be('localdemo');
    expect(resourceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo);
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

describe('test isNasAutoConfig', () => {
  it('test nasConfig is obj', () => {
    const nasConfig = {};
    expect(definition.isNasAutoConfig(nasConfig)).to.be(false);
  });

  it('isNasAutoConfig is null', () => {
    const nasConfig = null;
    expect(definition.isNasAutoConfig(nasConfig)).to.be(false);
  });

  it('isNasAutoConfig is Auto', () => {
    const nasConfig = 'Auto';
    expect(definition.isNasAutoConfig(nasConfig)).to.be(true);
  });
  it('isNasAutoConfig is Auto(true) with userId and groupId', () => {
    const nasConfig = {
      Auto: true,
      UserId: 33,
      GroupId: 33
    };
    expect(definition.isNasAutoConfig(nasConfig)).to.be(true);
  });
  it('isNasAutoConfig is Auto(false) with userId and groupId', () => {
    const nasConfig = {
      Auto: false,
      UserId: 33,
      GroupId: 33
    };
    expect(definition.isNasAutoConfig(nasConfig)).to.be(false);
  });
});

describe('test parseDomainRoutePath', () => {
  it('#test domainRoutePath with domainName and routePath', () => {
    const result = ['fc.com', '/a'];
    expect(definition.parseDomainRoutePath('fc.com/a')).to.eql(result);
  });

  it('#test domainRoutePath with domainName', () => {
    const result = ['fc.com', null];
    expect(definition.parseDomainRoutePath('fc.com')).to.eql(result);
  });
});