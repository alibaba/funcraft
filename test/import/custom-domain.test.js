'use strict';

const { customDomain1, customDomain2, customDomainResource1, customDomainResource2 } = require('./custom-domain');
const { getTemplateHeader } = require('../../lib/import/utils');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();
const listCustomDomains = sandbox.stub();
const getCustomDomain = sandbox.stub();


const client = {
  getFcClient: () => {
    return {
      listCustomDomains,
      getCustomDomain
    };
  }
};

const utils = {
  outputTemplateFile: sandbox.stub()
};

const path = {
  resolve: sandbox.stub()
};

const customDomainStub = proxyquire('../../lib/import/custom-domain', {
  '../client': client,
  './utils': utils,
  'path': path
});

describe('import custom-domain', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('import all custom domain', async () => {
    const response = {
      data: {
        customDomains: [ customDomain1, customDomain2 ]
      }
    };
    listCustomDomains.returns(response);
    path.resolve.returns('.');

    await customDomainStub.importCustomDomain();
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        [customDomain1.customDomain]: customDomainResource1,
        [customDomain2.customDomain]: customDomainResource2
      }
    }));
  });

  it('import custom domain with custom domain name', async () => {
    const response = {
      data: customDomain1
    };
    getCustomDomain.returns(response);
    path.resolve.returns('.');

    await customDomainStub.importCustomDomain('foo.com');
    sandbox.assert.calledWith(utils.outputTemplateFile, '.', Object.assign(getTemplateHeader(), {
      Resources: {
        [customDomain1.customDomain]: customDomainResource1
      }
    }));
  });
});