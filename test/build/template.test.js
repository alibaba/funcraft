'use strict';

const expect = require('expect.js');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const definition = require('../../lib/definition');
const path = require('path');

const {
  findBuildFuncs, updateTemplateResources
} = require('../../lib/build/template');

describe('test findBuildFuncs', () => {

  const buildName = 'test';

  beforeEach(() => {
    sandbox.stub(definition, 'findFunctionInTpl').returns({ functionName: 'function' });
    sandbox.stub(definition, 'findFunctionsInTpl').returns(['func1', 'func2']);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('test with buildName', async function () {

    const funcs = findBuildFuncs(buildName, {});

    assert.calledWith(definition.findFunctionInTpl, buildName, {});
    expect(funcs).to.eql([{ functionName: 'function' }]);
  });

  it('test without buildName', async function () {
    const funcs = findBuildFuncs(null, {});

    assert.calledWith(definition.findFunctionsInTpl, {});
    expect(funcs).to.eql(['func1', 'func2']);
  });
});

describe('test findBuildFuncs', () => {

  const buildName = 'test';

  beforeEach(() => {
    sandbox.stub(definition, 'findFunctionInTpl').returns({ functionName: 'function' });
    sandbox.stub(definition, 'findFunctionsInTpl').returns(['func1', 'func2']);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('test with buildName', async function () {

    const funcs = findBuildFuncs(buildName, {});

    assert.calledWith(definition.findFunctionInTpl, buildName, {});
    expect(funcs).to.eql([{ functionName: 'function' }]);
  });
});

describe('test updateTemplateResources', () => {

  const originTplContent = {
    'ROSTemplateFormatVersion': '2015-09-01',
    'Transform': 'Aliyun::Serverless-2018-04-03',
    'Resources': {
      'testDemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Description': 'php local invoke demo'
        },
        'testFunc1': {
          'Type': 'Aliyun::Serverless::Function',
          'Properties': {
            'Handler': 'index.handler',
            'CodeUri': 'python3',
            'Description': 'Hello world with python3!',
            'Runtime': 'python3'
          }
        }
      }
    }
  };

  beforeEach(() => {

  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test updateTemplateResources with buildFuncs but no skippedBuildFuncs', async function () {
    const buildFuncs = [
      { serviceName: 'testDemo', functionName: 'testFunc1' }
    ];

    const skippedBuildFuncs = [];
    const updatedTemplate = updateTemplateResources(originTplContent, buildFuncs, skippedBuildFuncs, '/', '/root');

    expect(updatedTemplate).to.eql(
      {
        'ROSTemplateFormatVersion': '2015-09-01',
        'Resources': {
          'testDemo': {
            'Properties': {
              'Description': 'php local invoke demo'
            },
            'Type': 'Aliyun::Serverless::Service',
            'testFunc1': {
              'Properties': {
                'CodeUri': path.join('testDemo', 'testFunc1'),
                'Description': 'Hello world with python3!',
                'Handler': 'index.handler',
                'Runtime': 'python3'
              },
              'Type': 'Aliyun::Serverless::Function'
            }
          }
        },
        'Transform': 'Aliyun::Serverless-2018-04-03'
      }
    );
  });

  it('test updateTemplateResources with buildFuncs and skippedBuildFuncs', async function () {

    const func = { serviceName: 'testDemo', functionName: 'testFunc1' };

    const buildFuncs = [ func ];

    const skippedBuildFuncs = [ func ];

    const updatedTemplate = updateTemplateResources(originTplContent, buildFuncs, skippedBuildFuncs, '/', '/root');

    expect(updatedTemplate).to.eql(
      {
        'ROSTemplateFormatVersion': '2015-09-01',
        'Resources': {
          'testDemo': {
            'Properties': {
              'Description': 'php local invoke demo'
            },
            'Type': 'Aliyun::Serverless::Service',
            'testFunc1': {
              'Properties': {
                'CodeUri': path.join('..', 'python3'),
                'Description': 'Hello world with python3!',
                'Handler': 'index.handler',
                'Runtime': 'python3'
              },
              'Type': 'Aliyun::Serverless::Function'
            }
          }
        },
        'Transform': 'Aliyun::Serverless-2018-04-03'
      }
    );
  });

  it('test updateTemplateResources but no buildFuncs', async function () {

    const buildFuncs = [];

    const skippedBuildFuncs = [];

    const updatedTemplate = updateTemplateResources(originTplContent, buildFuncs, skippedBuildFuncs, '/', '/root');

    expect(updatedTemplate).to.eql(
      {
        'ROSTemplateFormatVersion': '2015-09-01',
        'Resources': {
          'testDemo': {
            'Properties': {
              'Description': 'php local invoke demo'
            },
            'Type': 'Aliyun::Serverless::Service',
            'testFunc1': {
              'Properties': {
                'CodeUri': path.join('..', 'python3'),
                'Description': 'Hello world with python3!',
                'Handler': 'index.handler',
                'Runtime': 'python3'
              },
              'Type': 'Aliyun::Serverless::Function'
            }
          }
        },
        'Transform': 'Aliyun::Serverless-2018-04-03'
      }
    );
  });
});