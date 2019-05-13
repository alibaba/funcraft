'use strict';

const expect = require('expect.js');
const sinon = require('sinon');

describe('edge/Runner', function () {
  const LocalRuntime = require('../../lib/edge/runtime');
  const definition = require('../../lib/definition');
  const template = {
    Properties: {
      Handler: 'index.handler',
      Runtime: 'nodejs8',
      CodeUri: './',
      Timeout: 60
    }
  };
  let findFunction;
  let LocalRunner;
  before(function () {
    findFunction = sinon.stub(definition, 'findFunctionInTpl').returns({
      functionRes: template
    });
    LocalRunner = require('../../lib/edge/runner');
  });
  after(function () {
    findFunction.restore();
  });

  describe('#invoke', function () {
    const runtime = new LocalRuntime();
    const options = {
      cwd: __dirname,
      runtime,
      template,
      profile: {
        region: 'cn-hangzhou',
        accountId: 'account_id'
      },
      debugInfo: {
        debugPort: 5700,
        outputDebuggerConfigs: true
      }
    };
    const identifier = {
      serviceName: 'service_name',
      functionName: 'function_name'
    };
    let runtimeInvoke;
    beforeEach(function () {
      runtimeInvoke = sinon.stub(runtime, 'invoke');
    });
    afterEach(function () {
      runtimeInvoke.restore();
    });
    it('should throw since runtime invoking error', async function () {
      runtimeInvoke.rejects(new Error('Cannot invoke'));
      const runner = new LocalRunner(options);
      let error;
      try {
        await runner.invoke(identifier, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
  });
});