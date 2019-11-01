'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;
const expect = require('expect.js');

const { setCORSHeaders } = require('../lib/cors');

const resHeaders = {
  'testHeader': 'testHeaderValue',
  'Access-Control-Allow-Origin': 'origin',
  'Access-Control-Allow-Methods': 'access-control-request-method',
  'Access-Control-Allow-Headers': 'access-control-request-headers',
  'Access-Control-Expose-Headers': 'Date,X-Fc-Request-Id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
  'Access-Control-Max-Age': '3600'
};

const resHeadersWithoutOption = {
  'testHeader': 'testHeaderValue',
  'Access-Control-Expose-Headers': 'Date,X-Fc-Request-Id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
};

describe('cors test for http trigger', () => {

  let req;
  let res;
  beforeEach(() => {

    req = {
      path: '/test',
      headers: {
        'testHeader': 'testHeaderValue'
      }
    };

    res = {
      sendStatus: sandbox.stub(),
      headers: {
        'testHeader': 'testHeaderValue'
      },
      header: sandbox.stub().callsFake(function(key, value) {
        res.headers[key] = value;
      })
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('#options cors test', () => {
    req['method'] = 'options';

    req.headers['origin'] = 'origin';
    req.headers['access-control-request-method'] = 'access-control-request-method';
    req.headers['access-control-request-headers'] = 'access-control-request-headers';

    setCORSHeaders(req, res);
    expect(res.headers).to.eql(resHeaders);
  });

  it('#no options cors test', () => {

    const next = sandbox.stub();
    setCORSHeaders(req, res, next);
    expect(res.headers).to.eql(resHeadersWithoutOption);
    assert.callCount(next, 1);
  });
});