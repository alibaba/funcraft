'use strict';

const ApiInvoke = require('../../lib/local/api-invoke');

const sinon = require('sinon');
const assert = sinon.assert;

var express = require('express');
var app = express();
const path = require('path');
const mkdirp = require('mkdirp-promise');
const { hasDocker } = require('../conditions');
const tempDir = require('temp-dir');
const rimraf = require('rimraf');
const fs = require('fs');
const expect = require('expect.js');

const { serviceName, serviceRes, functionName, functionRes } = require('./mock-data');

const { setProcess } = require('../test-utils');

var FCClient = require('@alicloud/fc2');

const apiOutputSream = `FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
load code for handler:read.handler
--------------------response begin-----------------
${Buffer.from('HTTP/1.1 200 OK\r\n\r\ntestBody').toString('base64')}
--------------------response end-----------------
--------------------execution info begin-----------------
OWM4MWI1M2UtZWQxNy00MzI3LWFjNzctMjhkYWMzNzRlMDU1CjE4MgoxOTk4CjIwCg==
--------------------execution info end-----------------
    
    
[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`;

describe('test responseApi', async () => {
  const apiInvoke = new ApiInvoke(serviceName, serviceRes, functionName, functionRes, null, null, process.cwd());

  it('test normal resposne', async () => {
    const resp = {
      set: sinon.stub(),
      status: sinon.stub(),
      send: sinon.stub()
    };
  
    apiInvoke.response(apiOutputSream, '', resp);
  
    assert.calledWith(resp.set, {
      'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
      'content-type': 'application/octet-stream',
      'x-fc-invocation-duration': '182',
      'x-fc-invocation-service-version': 'LATEST',
      'x-fc-max-memory-usage': '20',
      'x-fc-request-id': '9c81b53e-ed17-4327-ac77-28dac374e055'
    });
      
    assert.calledWith(resp.send, Buffer.from('testBody'));
  });
  
});

(hasDocker ? describe : describe.skip)('Integration::api-invoke', () => {
  
  const projectDir = path.join(tempDir, 'api-invoke-it-dir'); 
  const index = path.join(projectDir, 'index.py');
  const serverPort = 8973;
  
  let server;
  let restoreProcess;
    
  beforeEach(async () => {

    await mkdirp(projectDir);

    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret'
    }, projectDir);

    console.log('tempDir: %s', projectDir);
  
    fs.writeFileSync(index, `
def handler(event, context):
    return "hello world"
  `);
  
    server = app.listen(serverPort, function () {
      console.log(`function compute app listening on port ${serverPort}!`);
      console.log();
    });
  });
    
  afterEach(async function () {
    rimraf.sync(projectDir);
    restoreProcess();

    server.close();
  });
  
  it('test api local invoke', async () => {

    const apiInvoke = new ApiInvoke(serviceName, serviceRes,
      functionName, functionRes, null, null, projectDir);

    const client = new FCClient('testAccountId', { 
      accessKeyID: 'testKeyId', 
      accessKeySecret: 'testKeySecret',
      region: 'test'
    });

    client.endpoint = `http://localhost:${serverPort}`;

    app.post(`/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`, async (req, res) => {
      apiInvoke.invoke(req, res);
    });

    const resp = await client.invokeFunction(serviceName, functionName, '');
    
    expect(resp.data).contain('hello world');
  });
});
    