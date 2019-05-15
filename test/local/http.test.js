'use strict';

const expect = require('expect.js');
const http = require('../../lib/local/http');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();

const FC = require('@alicloud/fc2');

const { setProcess } = require('../test-utils');

const httpOutputStream = `"FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
load code for handler:read.handler
--------------------response begin-----------------
SFRUUC8xLjEgMjAwIE9LDQp4LWZjLWh0dHAtcGFyYW1zOiBleUp6ZEdGMGRYTWlPakl3TUN3aWFHVmhaR1Z5Y3lJNmV5SmpiMjUwWlc1MExYUjVjR1VpT2lKaGNIQnNhV05oZEdsdmJpOXFjMjl1SW4wc0ltaGxZV1JsY25OTllYQWlPbnNpWTI5dWRHVnVkQzEwZVhCbElqcGJJbUZ3Y0d4cFkyRjBhVzl1TDJwemIyNGlYWDE5DQoNCnRlc3RCb2R5
--------------------response end-----------------
--------------------execution info begin-----------------
OWM4MWI1M2UtZWQxNy00MzI3LWFjNzctMjhkYWMzNzRlMDU1CjE4MgoxOTk4CjIwCg==
--------------------execution info end-----------------
    
    
[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`;

describe('test validateHeader', async () => {
  it('test valid header', () => {
    const result = http.validateHeader('headerKey', 'headerValue');
    expect(result).to.be(true);
  });

  it('test invalid header key', async () => {
    const result = http.validateHeader('键', 'headerValue');
    expect(result).to.be(false);
  });

  it('test invalid header value', async () => {
    const result = http.validateHeader('headerKey', '值');
    expect(result).to.be(false);
  });

  it('test valid header value array', async () => {
    const result = http.validateHeader('headerKey', ['headerValue1', 'headerValue2']);
    expect(result).to.be(true);
  });

  it('test invalid header value array', async () => {
    const result = http.validateHeader('headerKey', ['headerValue1', '值']);
    expect(result).to.be(false);
  });
});


describe('test filterFunctionResponseAndExecutionInfo', async () => {

  const response = `"FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
--------------------response begin-----------------
dGVzdA==
--------------------response end-----------------
--------------------execution info begin-----------------
NjVjYTQ3OGQtYjNjZi00MWQ1LWI2NjgtOWI4OWE0ZDQ4MWQ4CgoxOTk4Cgo=
--------------------execution info end-----------------

[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`.split('\n');

  it('filter response and execution info', async () => {
    const [httpResponse, executionInfo] = http.filterFunctionResponseAndExecutionInfo(response);
    expect(httpResponse).to.eql(['dGVzdA==']);
    expect(executionInfo).to.eql('NjVjYTQ3OGQtYjNjZi00MWQ1LWI2NjgtOWI4OWE0ZDQ4MWQ4CgoxOTk4Cgo=');
  });
});

describe('test generateHttpParams', async () => {
  it('test genrate http params', async () => {
    const req = {
      originUrl: 'originUrl',
      method: 'get',
      path: '/prefix/path',
      ip: '127.0.0.1',
      query: {
        host: 'localhost:8000'
      },
      rawHeaders: [
        'testHeader', 'testHeaderValue'
      ]
    };
    const res = http.generateHttpParams(req, '/prefix');
    expect(res).to.eql('eyJtZXRob2QiOiJnZXQiLCJwYXRoIjoiL3BhdGgiLCJjbGllbnRJUCI6IjEyNy4wLjAuMSIsInF1ZXJpZXNNYXAiOnsiaG9zdCI6WyJsb2NhbGhvc3Q6ODAwMCJdfSwiaGVhZGVyc01hcCI6eyJ0ZXN0SGVhZGVyIjpbInRlc3RIZWFkZXJWYWx1ZSJdfX0=');
  });
});

describe('test parseOutputStream', async () => {

  it('test parse headers and body and executionInfo and process output', async () => {
    const { headers, body, requestId, billedTime, memoryUsage } = http.parseOutputStream(httpOutputStream);
    expect(headers).to.eql({
      'x-fc-http-params': 'eyJzdGF0dXMiOjIwMCwiaGVhZGVycyI6eyJjb250ZW50LXR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sImhlYWRlcnNNYXAiOnsiY29udGVudC10eXBlIjpbImFwcGxpY2F0aW9uL2pzb24iXX19'
    });
    expect(body).to.eql(Buffer.from('testBody'));
    expect(requestId).to.eql('9c81b53e-ed17-4327-ac77-28dac374e055');
    expect(billedTime).to.eql('182');
    expect(memoryUsage).to.eql('20');
  });
});

// response 所包含的 body，是一张简单的图片，原有的 http-string-parser 在 split 时使用 \r?\n 的方式 split 会导致有问题
describe('test image response', async () => {
  const responseString = `SFRUUC8xLjEgMjAwIE9LDQpYLVBvd2VyZWQtQnk6IEV4cHJlc3MNCngtZmMtaHR0cC1wYXJhbXM6
IGV5SnpkR0YwZFhNaU9qSXdNQ3dpYUdWaFpHVnljeUk2ZXlKamIyNTBaVzUwTFhSNWNHVWlPaUpw
YldGblpTOXdibWNpZlN3aWFHVmhaR1Z5YzAxaGNDSTZleUpqYjI1MFpXNTBMWFI1Y0dVaU9sc2lh
VzFoWjJVdmNHNW5JbDE5ZlE9PQ0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9vY3RldC1zdHJl
YW0NCkNvbnRlbnQtTGVuZ3RoOiA5Nw0KRVRhZzogVy8iNjEtTGJKdGZrck01a0NoRnV4cnh4WVNM
bmZQRHVZIg0KRGF0ZTogV2VkLCAxNSBNYXkgMjAxOSAwNjo0MDo1MiBHTVQNCkNvbm5lY3Rpb246
IGtlZXAtYWxpdmUNCg0KiVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKElEQVQ4
jWNgYGD4Twzu6FhFFGYYNXDUwGFpIAk2E4dHDRw1cDgaCAASFOffhEIO3gAAAABJRU5ErkJggg==`;

  it('test parse response', async () => {
    const rawResponse = Buffer.from(responseString, 'base64').toString('binary');

    const parsedResponse = http.parseResponse(rawResponse);

    console.log('response is ' + parsedResponse.body);

    const base64Body = Buffer.from(parsedResponse.body, 'binary').toString('base64');
    expect(base64Body).to.eql('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKElEQVQ4jWNgYGD4Twzu6FhFFGYYNXDUwGFpIAk2E4dHDRw1cDgaCAASFOffhEIO3gAAAABJRU5ErkJggg==');
  });
});

describe('test validateSignature', async () => {

  let restoreProcess;
  let req;
  let res;
  const method = 'GET';
  const accessKeyId = 'testKeyId';
  const accessKeySecret = 'testKeySecret';
  const accountId = 'testAccountId';

  beforeEach(() => {

    req = {
      path: '/test',
      headers: {
        'testHeader': 'testHeaderValue'
      },
      queries: {}
    };

    res = {
      status: sandbox.stub(),
      send: sandbox.stub()
    };

    restoreProcess = setProcess({
      ACCOUNT_ID: accountId,
      ACCESS_KEY_ID: accessKeyId,
      ACCESS_KEY_SECRET: accessKeySecret
    });
  });

  afterEach(() => {
    restoreProcess();
  });

  it('test valid', async () => {

    const clientSignature = FC.getSignature(accessKeyId, accessKeySecret, method, req.path, req.headers, req.queries);

    req.headers['authorization'] = clientSignature;

    const valid = await http.validateSignature(req, res, method);

    expect(valid).to.be(true);
  });

  it('test invliad', async() => {
    const clientSignature = FC.getSignature(accessKeyId, accessKeySecret, method, req.path, req.headers, req.queries);

    req.headers['authorization'] = clientSignature;

    const valid = await http.validateSignature(req, res, 'POST');

    expect(valid).to.be(false);
  });
});

describe('test normalizeMultiValues', async () => {
  it('test normal', () => {
    const maps = {
      'header1': 'value1',
      'header2': ['value2', 'value3' ]
    };

    const expectMaps = {
      'header1': [ 'value1' ],
      'header2': [ 'value2', 'value3' ]
    };

    const normallized = http.normalizeMultiValues(maps);
    expect(normallized).to.eql(expectMaps);
  });

  it('test empty', () => {
    const maps = {};

    const normallized = http.normalizeMultiValues(maps);
    expect(normallized).to.eql({});
  });

  it('test null', () => {
    const maps = null;

    const normallized = http.normalizeMultiValues(maps);
    expect(normallized).to.eql({});
  });
});

describe('test normalizeRawHeaders', async () => {
  it('test normal', async () => {
    const rawHeaders = ['A', 'A',
      'B', 'B',
      'A', 'C'];
    const headers = http.normalizeRawHeaders(rawHeaders);
    expect(headers).to.eql({
      'A': ['A', 'C'],
      'B': ['B']
    });
  });
});
