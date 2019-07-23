'use strict';

const { service, serviceResouce } = require('./service');
const { func1, func2, func3, funcResource1, funcResource2, funcResource3 } = require('./function');
const { getTemplateHeader } = require('../../lib/import/utils');
const { 
  oss,
  http,
  log,
  mnsTopic,
  cdnEvents,
  rds,
  tablestore,
  timer
} = require('./trigger');

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const getService = sandbox.stub();
const listServices = sandbox.stub();
const listFunctions = sandbox.stub();
const listTriggers = sandbox.stub();
const getFunctionCode = sandbox.stub();

const client = {
  getFcClient: () => {
    return {
      getService,
      listServices,
      listFunctions,
      listTriggers,
      getFunctionCode
    };
  }
};

const utils = {
  outputTemplateFile: sandbox.stub(),
  getTemplateFile: sandbox.stub()
};

const path = {
  resolve: sandbox.stub()
};

const httpx = {
  request: sandbox.stub()
};

const serviceStub = proxyquire('../../lib/import/service', {
  '../client': client,
  './utils': utils,
  'path': path,
  'httpx': httpx
});

describe('import service', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('import simple service', async () => {
    const response = {
      data: service()
    };
    getService.returns(response);
    listFunctions.returns({
      data: {
        functions: [ func1, func2, func3 ]
      }
    });
    path.resolve.returns('.');

    await serviceStub.importService(service().serviceName, '.', false);
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        [service().serviceName]: serviceResouce()
      }
    }));
  });

  it('import all services', async () => {
    const response = {
      data: {
        services: [ service() ]
      }
    };
    listServices.returns(response);
    listFunctions.returns({
      data: { functions: [] }
    });
  
    path.resolve.returns('.');

    await serviceStub.importService();
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        [service().serviceName]: serviceResouce()
      }
    }));
  });

  it('import service and function', async () => {
    const response = {
      data: service()
    };
    getService.returns(response);
    getFunctionCode.returns({ data: {}});
    listFunctions.returns({
      data: {
        functions: [ func1, func2, func3 ]
      }
    });
    listTriggers.withArgs(service().serviceName, func1.functionName).returns({
      data: {
        triggers: [
          oss,
          http,
          log,
          mnsTopic,
          cdnEvents,
          rds,
          tablestore,
          timer
        ]
      }
    });
    listTriggers.returns({
      data: {
        triggers: []
      }
    });
    path.resolve.returns('.');

    const on = (event, listener) => {
      if (event === 'finish') {
        listener();
      } else if (event === 'end') {
        listener();
      }
      return { on };
    };

    httpx.request.returns({
      headers: {},
      on,
      pipe: arg => ( { on })
    });

    await serviceStub.importService(service().serviceName);
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        [service().serviceName]: Object.assign(serviceResouce(), {
          [func1.functionName]: funcResource1,
          [func2.functionName]: funcResource2,
          [func3.functionName]: funcResource3
        })
      }
    }));
  });

  it('import service with service exists', async () => {
    utils.getTemplateFile.returns({
      templateFilePath: '.',
      content: Object.assign(getTemplateHeader(), {
        Resources: {
          service: service()
        }
      })
    });
    path.resolve.returns('.');
    try {
      await serviceStub.importServie(service().serviceName);
    } catch (error) {
      return;
    }
    expect().fail('expect throw Error.');

  });

});