'use strict';

const { serviceResouce } = require('./service');
const { func1, func2, funcResource1, funcResource2 } = require('./function');
const { getTemplateHeader } = require('../../lib/import/utils');
const expect = require('expect.js');

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();
const getFunction = sandbox.stub();

const client = {
  getFcClient: () => {
    return {
      getFunction
    };
  }
};

const utils = {
  outputTemplateFile: sandbox.stub(),
  getTemplateFile: sandbox.stub()
};

const service = {
  getFunctionResource: sandbox.stub(),
  getServiceResource: sandbox.stub(),
  getServiceMeta: sandbox.stub()
};

const path = {
  resolve: sandbox.stub()
};

const functionStub = proxyquire('../../lib/import/function', {
  '../client': client,
  './utils': utils,
  './service': service,
  'path': path
});

describe('import function', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('import simple function', async () => {
    const response = {
      data: func1
    };
    service.getServiceResource.returns(serviceResouce());
    service.getFunctionResource.returns(funcResource1);
    getFunction.returns(response);
    path.resolve.returns('.');

    await functionStub.importFunction('service', func1.functionName, '.', false);
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        service: Object.assign(serviceResouce(), {
          [func1.functionName]: funcResource1
        })
      }
    }));
  });

  it('import function with template file exists', async () => {
    const response = {
      data: func1
    };
    utils.getTemplateFile.returns({
      templateFilePath: '.',
      content: Object.assign(getTemplateHeader(), {
        Resources: {
          service: Object.assign(serviceResouce(), {
            [func2.functionName]: funcResource2
          })
        }
      })
    });
    service.getServiceMeta.returns({});
    service.getServiceResource.returns(serviceResouce());
    service.getFunctionResource.returns(funcResource1);
    getFunction.returns(response);
    path.resolve.returns('.');

    await functionStub.importFunction('service', func1.functionName, '.');
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        service: Object.assign(serviceResouce(), {
          [func1.functionName]: funcResource1,
          [func2.functionName]: funcResource2
        })
      }
    }));
  });

  it('import function with function exists', async () => {
    const response = {
      data: func1
    };
    utils.getTemplateFile.returns({
      templateFilePath: '.',
      content: Object.assign(getTemplateHeader(), {
        Resources: {
          service: Object.assign(serviceResouce(), {
            [func1.functionName]: funcResource2
          })
        }
      })
    });
    service.getServiceMeta.returns({});
    service.getServiceResource.returns(serviceResouce());
    service.getFunctionResource.returns(funcResource1);
    getFunction.returns(response);
    path.resolve.returns('.');
    try {
      await functionStub.importFunction('service', func1.functionName, '.');
    } catch (error) {
      return;
    }
    expect().fail('expect throw Error.');

  });

  it('import function with resource exists', async () => {
    const response = {
      data: func1
    };
    utils.getTemplateFile.returns({
      templateFilePath: '.',
      content: Object.assign(getTemplateHeader(), {
        Resources: {
          service: {
            Type: 'xxx'
          }
        }
      })
    });
    service.getServiceResource.returns(serviceResouce());
    service.getFunctionResource.returns(funcResource1);
    getFunction.returns(response);
    path.resolve.returns('.');
    try {
      await functionStub.importFunction('service', func1.functionName, '.');
    } catch (error) {
      return;
    }
    expect().fail('expect throw Error.');

  });

});