'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const expect = require('expect.js');
const proxyquire = require('proxyquire');

const fc = require('../lib/fc');
const fs = require('fs-extra');
const path = require('path');
const rimraf = require('rimraf');
const prompt = require('../lib/init/prompt');

const { setProcess } = require('./test-utils');
const { detectTplPath } = require('../lib/tpl');

const mockData = require('./tpl-mock-data');

const validate = sandbox.stub();

const service = {
  getTriggerMetas: sandbox.stub()
};

const tpl = {

  getTpl: sandbox.stub(),
  detectTplPath: sandbox.stub().resolves({})
};

const file = {
  getEvent: sandbox.stub()
};

describe('fun-invoke test', () => {
  let restoreProcess;

  beforeEach(() => {

    sandbox.stub(prompt, 'promptForFunctionSelection').resolves({
      serviceName: 'localdemo',
      functionName: 'python3'
    });

    sandbox.stub(fc, 'invokeFunction').resolves({});

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET',
      DEFAULT_REGION: 'cn-shanghai'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  async function invokeFuntion(invokeName, options) {

    await proxyquire('../lib/commands/invoke.js', {
      '../fc': fc,
      '../tpl': tpl,
      '../init/prompt': prompt,
      '../utils/file': file,
      '../../lib/commands/validate': validate,
      '../../lib/import/service': service
    })(invokeName, options);
  }

  it('fun invoke ros template test', async () => {

    const rosTemplatePath = path.join('.fun', 'tmp', 'rosTemplate.json');

    const absRosTemplatePath = path.resolve(rosTemplatePath);

    await fs.outputFile(absRosTemplatePath, JSON.stringify(mockData.rosTemplate));

    tpl.getTpl.returns(mockData.tpl);
    service.getTriggerMetas.returns({});
    await invokeFuntion(undefined, {
      event: '',
      invocationType: 'Sync'

    });

    rimraf.sync(`${process.cwd()}/.fun/`);

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'ros-ellison-localdemo-6E86262F4770',
      functionName: 'ros-ellison-python3-BD6A72101919',
      event: '',
      invocationType: 'Sync'
    });
  });


  it('fun invoke without invokeName, default first function in tpl', async () => {

    tpl.getTpl.returns(mockData.tpl);
    service.getTriggerMetas.returns({});
    await invokeFuntion(undefined, {
      event: '',
      invocationType: 'Sync'

    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'localdemo',
      functionName: 'python3',
      event: '',
      invocationType: 'Sync'
    });
  });

  it('serviceName/functionName and event is empty stirng and uppercase Sync', async () => {

    service.getTriggerMetas.returns({});
    await invokeFuntion('serviceName/functionName', {
      event: '',
      invocationType: 'Sync'

    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'serviceName',
      functionName: 'functionName',
      event: '',
      invocationType: 'Sync'
    });
  });

  it('serviceName/functionName and event is eventStdin and uppercase Sync', async () => {

    file.getEvent.returns('eventStdin');
    service.getTriggerMetas.returns({});
    await invokeFuntion('serviceName/functionName', {
      event: '',
      invocationType: 'Sync',
      eventStdin: 'eventStdin'
    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'serviceName',
      functionName: 'functionName',
      event: 'eventStdin',
      invocationType: 'Sync'
    });
  });

  it('serviceName/functionName and event is empty stirng and lowercase async', async () => {

    service.getTriggerMetas.returns({});
    await invokeFuntion('serviceName/functionName', {
      event: '',
      invocationType: 'async'

    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'serviceName',
      functionName: 'functionName',
      event: '',
      invocationType: 'Async'
    });
  });


  it('serviceName/functionName and event is eventFile and uppercase Sync', async () => {

    file.getEvent.returns('eventFile');
    service.getTriggerMetas.returns({});

    await invokeFuntion('serviceName/functionName', {
      event: '',
      invocationType: 'Sync',
      eventFile: './'
    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'serviceName',
      functionName: 'functionName',
      event: 'eventFile',
      invocationType: 'Sync'
    });
  });


  it('single functionName and event is empty stirng and uppercase Sync', async () => {

    tpl.getTpl.returns(mockData.tpl);
    service.getTriggerMetas.returns({});
    await invokeFuntion('python3', {
      event: '',
      invocationType: 'Sync'

    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'localdemo',
      functionName: 'python3',
      event: '',
      invocationType: 'Sync'
    });
  });

  it('duplicated functions and event is empty stirng and uppercase Sync', async () => {

    tpl.getTpl.returns(mockData.tplWithDuplicatedFunction);
    service.getTriggerMetas.returns({});
    await invokeFuntion('python3', {
      event: '',
      invocationType: 'Sync'

    });

    assert.calledWith(fc.invokeFunction, {
      serviceName: 'localdemo',
      functionName: 'python3',
      event: '',
      invocationType: 'Sync'
    });
  });


  it('exit http trigger in function', async () => {

    service.getTriggerMetas.returns([
      {
        'triggerName': 'http-test',
        'description': '',
        'triggerId': 'c364dbea-31d7-43a9-93e2-2cad4ea4c4e3',
        'sourceArn': null,
        'triggerType': 'http',
        'invocationRole': null,
        'qualifier': null,
        'triggerConfig': {
          'methods': [
            'GET',
            'POST',
            'PUT'
          ],
          'authType': 'anonymous'
        },
        'createdTime': '2019-04-08T08:20:00Z',
        'lastModifiedTime': '2019-08-23T02:32:12Z'
      }
    ]);

    tpl.getTpl.returns(mockData.tplWithDuplicatedFunction);

    await invokeFuntion('python3', {
      event: '',
      invocationType: 'Sync'
    });

    assert.notCalled(fc.invokeFunction);
  });


  it('http trigger bind more than one qualifier', async () => {
    service.getTriggerMetas.returns([
      {
        'triggerName': 'http-test',
        'description': '',
        'triggerId': 'c364dbea-31d7-43a9-93e2-2cad4ea4c4e3',
        'sourceArn': null,
        'triggerType': 'http',
        'invocationRole': null,
        'qualifier': 'superman',
        'triggerConfig': {
          'methods': [
            'GET',
            'POST',
            'PUT'
          ],
          'authType': 'anonymous'
        },
        'createdTime': '2019-04-08T08:20:00Z',
        'lastModifiedTime': '2019-08-23T02:32:12Z'
      }
    ]);

    tpl.getTpl.returns(mockData.tplWithDuplicatedFunction);

    await invokeFuntion('python3', {
      event: '',
      invocationType: 'Sync'
    });

    assert.notCalled(fc.invokeFunction);
  });
});

describe('tpl detectTplPath test', () => {

  it('yml exits', async () => {
    const ymlPath = path.join(process.cwd(), './template.yml');
    await fs.createFile(ymlPath);
    const result = await detectTplPath();
    rimraf.sync(ymlPath);
    expect(result).to.be(path.join(process.cwd(), './template.yml'));
  });

  it('yml not exits', async () => {
    const result = await detectTplPath();
    expect(result).to.be(null);
  });
});
