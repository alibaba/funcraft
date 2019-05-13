/* eslint-disable callback-return */

'use strict';

const expect = require('expect.js');
const sinon = require('sinon');

const https = require('https');
const EventEmitter = require('events');
const agent = require('../../lib/edge/agent');

const TEST_DEPLOY_FUNCTION = {
  functionId: 'function_id',
  serviceName: 'service_name',
  functionName: 'function_name',
  handler: 'index.handler',
  runtime: 'nodejs8',
  timeout: 3,
  memory: 128,
  codeDir: '/tmp/',
  accountId: 'account_id',
  region: 'cn-hangzhou',
  pinned: true,
  envVars: {
    TEST_ENVIRONMENT: 'test_environment'
  },
  debugPort: 5700
};

const TEST_INVOKE_FUNCTION = {
  functionId: 'function_id',
  serviceName: 'service_name',
  functionName: 'function_name',
  accountId: 'account_id',
  region: 'cn-hangzhou',
  event: '{}'
};

class ClientRequest extends EventEmitter {
  write() {}
  end() {}
}

const cookie = 'd3f19b4c9218f4fac6ead23554fd8aa4ba0d08a3';
class ServerResponse extends EventEmitter {
  constructor() {
    super();
    this.headers = {
      'set-cookie': cookie
    };
  }
}

describe('edge/FunctionComputeClient', function () {
  let httpsRequest;
  beforeEach(function () {
    httpsRequest = sinon.stub(https, 'request');
  });
  afterEach(function () {
    httpsRequest.restore();
  });
  describe('#login', function () {
    it('should throw since request writing error', async function () {
      const clientRequest = new ClientRequest();
      const write = sinon.stub(clientRequest, 'write').callsFake(function () {
        clientRequest.emit('error', new Error('Cannot write'));
      });
      httpsRequest.callsFake(function (options, callback) {
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.login();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      write.restore();
    });

    it('should throw since server internal error', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', '');
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.login();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      end.restore();
    });
    it('should throw since authentication fails', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 400,
          message: 'User name or password incorrect'
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.login();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      end.restore();
    });
    it('should pass since all requirements meet', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 200
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.login();
      } catch (err) {
        error = err;
      }
      expect(error).to.not.be.an(Error);
      end.restore();

    });
  });
  describe('#deploy', function () {
    it('should throw since neither Function id nor serviceName/functionName is provided', async function () {
      const info = Object({}, TEST_DEPLOY_FUNCTION, {
        functionId: undefined,
        serviceName: undefined,
        functionName: undefined
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.deploy(info);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
    it('should throw since login fails', async function () {
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').rejects(new Error('Cannot login'));
      let error;
      try {
        await client.deploy(TEST_DEPLOY_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
    });
    it('should throw since request writing error', async function () {
      const clientRequest = new ClientRequest();
      const write = sinon.stub(clientRequest, 'write').callsFake(function () {
        clientRequest.emit('error', new Error('Cannot write'));
      });
      httpsRequest.callsFake(function (options, callback) {
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.deploy(TEST_DEPLOY_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      write.restore();
    });
    it('should throw since server internal error', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', '');
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.deploy(TEST_DEPLOY_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      end.restore();
    });
    it('should throw since memory size error', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 400,
          message: 'Memory size is not a number'
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      const info = Object.assign({}, TEST_DEPLOY_FUNCTION, {
        memory: '128'
      });
      let error;
      try {
        await client.deploy(info);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      end.restore();
    });
    it('should pass since all requirements meet', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 200
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.deploy(TEST_DEPLOY_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.not.be.an(Error);
      login.restore();
      end.restore();
    });
  });
  describe('#invoke', function () {
    it('should throw since neither Function id nor serviceName/functionName is provided', async function () {
      const info = {
        accountId: TEST_DEPLOY_FUNCTION.accountId,
        region: TEST_DEPLOY_FUNCTION.region
      };
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.invoke(info);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
    it('should throw since invocation type is neither Sync nor Async', async function () {
      const info = Object.assign({}, TEST_INVOKE_FUNCTION, {
        invocationType: 'Test'
      });
      const client = new agent.FunctionComputeClient();
      let error;
      try {
        await client.invoke(info);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
    it('should throw since login fails', async function () {
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').rejects(new Error('Cannot login'));
      let error;
      try {
        await client.invoke(TEST_INVOKE_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
    });
    it('should throw since request writing error', async function () {
      const clientRequest = new ClientRequest();
      const write = sinon.stub(clientRequest, 'write').callsFake(function () {
        clientRequest.emit('error', new Error('Cannot write'));
      });
      httpsRequest.callsFake(function (options, callback) {
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.invoke(TEST_INVOKE_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      write.restore();
    });
    it('should throw since server internal error', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', '');
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.invoke(TEST_INVOKE_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      end.restore();
    });
    it('should throw since function not found error', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 400,
          message: 'Function not found'
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.invoke(TEST_INVOKE_FUNCTION);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      login.restore();
      end.restore();
    });
    it('should pass since all requirements meet', async function () {
      let cb;
      const serverResponse = new ServerResponse();
      const clientRequest = new ClientRequest();
      const end = sinon.stub(clientRequest, 'end').callsFake(function () {
        cb(serverResponse);
        serverResponse.emit('data', JSON.stringify({
          code: 200,
          data: Buffer.from('result').toString('base64')
        }));
        serverResponse.emit('end');
      });
      httpsRequest.callsFake(function (options, callback) {
        cb = callback;
        return clientRequest;
      });
      const client = new agent.FunctionComputeClient();
      const login = sinon.stub(client, 'login').resolves(cookie);
      let error;
      try {
        await client.invoke(TEST_INVOKE_FUNCTION);
      } catch (err) {
        error = err;
      }
      console.log(error);
      expect(error).to.not.be.an(Error);
      login.restore();
      end.restore();
    });
  });
});
