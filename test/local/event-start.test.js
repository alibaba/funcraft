'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;

const Invoke = require('../../lib/local/invoke');

let EventStart = require('../../lib/local/event-start');

const { functionName, functionRes,
  serviceName, serviceRes,
  debugPort, debugIde,
  codeMount } = require('./mock-data');

const docker = require('../../lib/docker');
const dockerOpts = require('../../lib/docker-opts');

const proxyquire = require('proxyquire');

describe('test event start init', async () => {

  beforeEach(() => {
    const container = {
      logs: () => {}
    };

    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(docker, 'generateDockerEnvs').resolves({});
    sandbox.stub(docker, 'createAndRunContainer').resolves(container);

    sandbox.stub(Invoke.prototype, 'init').resolves({});

    EventStart = proxyquire('../../lib/local/event-start', {
      '../docker': docker,
      '../docker-opts': dockerOpts
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test init', async () => {
    sandbox.stub(docker, 'listContainers').resolves([]);
    const invoke = new EventStart(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      '.');

    await invoke.init();

    expect(invoke.opts.Cmd).to.eql([ '--server' ]);

    assert.calledWith(docker.generateDockerEnvs,
      '.', serviceName, serviceRes.Properties, functionName, functionRes.Properties, invoke.debugPort, null,
      invoke.nasConfig, false, invoke.debugIde, invoke.debugArgs
    );

    assert.calledWith(docker.listContainers.firstCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug-inited"]}` });
    assert.calledWith(docker.listContainers.secondCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug"]}` });
    assert.calledWith(docker.createAndRunContainer, invoke.opts);
  });
});