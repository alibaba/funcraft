'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const path = require('path');

const LocalRuntime = require('../../lib/edge/runtime');

describe('edge/LocalRuntime', function () {
  describe('#invoke', function () {
    let config;
    beforeEach(function () {
      config = {
        runtime: 'nodejs8',
        identifier: {
          region: 'ch-hangzhou',
          accountId: 'account_id',
          serviceName: 'service_name',
          functionName: 'function_name'
        },
        handler: 'index.handler',
        timeout: 3,
        memory: 128,
        codeAbsPath: path.resolve(__dirname, '../../examples/helloworld/helloworld.js')
      };
    });

    afterEach(function () {
      config = undefined;
    });
    it('should fail since unsupported runtime', async function () {
      config.runtime = 'java8';
      const runtime = new LocalRuntime();
      let error;
      try {
        await runtime.invoke(config, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
    it('should fail since copying code to container fails', async function () {
      const runtime = new LocalRuntime();
      const stub = sinon.stub(runtime.container, 'copy').rejects(new Error('Cannot copy'));
      let error;
      try {
        await runtime.invoke(config, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      stub.restore();
    });
    it('should fail since deploying function fails', async function () {
      const runtime = new LocalRuntime();
      const copy = sinon.stub(runtime.container, 'copy').resolves();
      const deploy = sinon.stub(runtime.client, 'deploy').rejects(new Error('Cannot deploy'));
      let error;
      try {
        await runtime.invoke(config, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      deploy.restore();
      copy.restore();
    });
    it('should fail since invoking function fails', async function () {
      const runtime = new LocalRuntime();
      const copy = sinon.stub(runtime.container, 'copy').resolves();
      const deploy = sinon.stub(runtime.client, 'deploy').resolves();
      const invoke = sinon.stub(runtime.client, 'invoke').rejects(new Error('Cannot invoke'));
      let error;
      try {
        await runtime.invoke(config, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      invoke.restore();
      deploy.restore();
      copy.restore();
    });
    it('should pass since all requirements meet', async function () {
      const runtime = new LocalRuntime();
      const copy = sinon.stub(runtime.container, 'copy').resolves();
      const deploy = sinon.stub(runtime.client, 'deploy').resolves();
      const invoke = sinon.stub(runtime.client, 'invoke').resolves(Buffer.from(''));
      let error;
      try {
        await runtime.invoke(config, {});
      } catch (err) {
        error = err;
      }
      expect(error).to.be(undefined);
      invoke.restore();
      deploy.restore();
      copy.restore();
    });
    it('should output debugger configs since output-debugger-configs is set', async function () {
      const runtime = new LocalRuntime();
      const copy = sinon.stub(runtime.container, 'copy').resolves();
      const deploy = sinon.stub(runtime.client, 'deploy').resolves();
      const invoke = sinon.stub(runtime.client, 'invoke').resolves(Buffer.from(''));
      const spy = sinon.spy(console, 'log');
      await runtime.invoke(config, {}, {
        debugPort: 5700,
        outputDebuggerConfigs: true
      });
      expect(spy.calledWith(sinon.match('Attach to Fun (Node.js 8)')));
      spy.restore();
      invoke.restore();
      deploy.restore();
      copy.restore();
    });
    it('should output python debugger configs since runtime is python3', async function () {
      config.runtime = 'python3';
      const runtime = new LocalRuntime();
      const copy = sinon.stub(runtime.container, 'copy').resolves();
      const deploy = sinon.stub(runtime.client, 'deploy').resolves();
      const invoke = sinon.stub(runtime.client, 'invoke').resolves(Buffer.from(''));
      const spy = sinon.spy(console, 'log');
      await runtime.invoke(config, {}, {
        debugPort: 5700,
        outputDebuggerConfigs: true
      });
      expect(spy.calledWith(sinon.match('Attach to Fun (Python 3)')));
      spy.restore();
      invoke.restore();
      deploy.restore();
      copy.restore();
    });
  });
});