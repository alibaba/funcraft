'use strict';

let httpSupport = require('../../../lib/commands/local/http-support');

const { serviceName, httptriggerServiceRes, 
  functionName, httpTriggerFunctionRes,
  serviceRes, functionRes,
  triggerName, triggerRes
} = require('../../local/mock-data');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const fc = require('../../../lib/fc');
const proxyquire = require('proxyquire');
const assert = sandbox.assert;

const os = require('os');
const path = require('path');

describe('test registerHttpTriggers', () => {

  before(async () => {

    sandbox.stub(fc, 'detectLibrary').resolves({});

    httpSupport = proxyquire('../../../lib/commands/local/http-support', {
      '../../fc': fc
    });
  });

  after(async () => {
    sandbox.restore();
  });

  it('test register http trigger', async () => {

    const app = {
      'get': sandbox.stub(),
      'put': sandbox.stub(),
      'post': sandbox.stub(),
      'use': sandbox.stub()
    };

    const router = {
      'get': sandbox.stub(),
      'put': sandbox.stub(),
      'post': sandbox.stub(),
      'use': sandbox.stub()
    };
    const tplPath = os.tmpdir();

    const triggers = [{
      serviceName,
      functionName,
      serviceRes: httptriggerServiceRes,
      functionRes: httpTriggerFunctionRes,
      triggerName,
      triggerRes: triggerRes
    }];

    await httpSupport.registerHttpTriggers(app, router, 8080, triggers, null, null, path.dirname(tplPath));

    assert.calledWith(fc.detectLibrary,
      httpTriggerFunctionRes.Properties.CodeUri,
      httpTriggerFunctionRes.Properties.Runtime,
      path.dirname(tplPath));

    assert.calledWith(router['get'], `/2016-08-15/proxy/${serviceName}/${functionName}*`, sinon.match.func);
    assert.calledWith(router['post'], `/2016-08-15/proxy/${serviceName}/${functionName}*`, sinon.match.func);
    assert.calledWith(router['put'], `/2016-08-15/proxy/${serviceName}/${functionName}*`, sinon.match.func);
  });
});

describe('test registerApis', () => {

  before(async () => {

    sandbox.stub(fc, 'detectLibrary').resolves({});

    httpSupport = proxyquire('../../../lib/commands/local/http-support', {
      '../../fc': fc
    });
  });

  after(async () => {
    sandbox.restore();
  });

  it('test register api', async () => {  

    const app = {
      'post': sandbox.stub()
    };

    const tplPath = path.join(os.tmpdir(), 'template.yml');
    const baseDir = path.dirname(tplPath);

    const functions = [{
      serviceName,
      functionName,
      serviceRes,
      functionRes
    }];

    await httpSupport.registerApis(app, 8080, functions, null, null, baseDir);

    assert.calledWith(fc.detectLibrary, 
      httpTriggerFunctionRes.Properties.CodeUri, 
      httpTriggerFunctionRes.Properties.Runtime,
      baseDir);

    assert.calledWith(app.post, `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`, sinon.match.func);
  });
});