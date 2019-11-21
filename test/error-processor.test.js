'use strict';

const { processorTransformFactory } = require('../lib/error-processor');
const streams = require('memory-streams');
const expect = require('expect.js');
const sinon = require('sinon');
const snadbox = sinon.createSandbox();
const httpx = require('httpx');
const assert = snadbox.assert;

describe('test error-processor', async () => {

  beforeEach(() => {
    snadbox.stub(httpx, 'request').resolves('response');
    snadbox.stub(httpx, 'read').resolves('content');
  });

  afterEach(() => {
    snadbox.restore();
  });

  it('test normal', (done) => {

    const testNormal = 'test\nlogtest';

    const errorStream = new streams.WritableStream();

    const Readable = require('stream').Readable;
    const s = new Readable();
    s._read = () => {
      s.push(testNormal);
      s.push(null);
    };

    const transform = processorTransformFactory({
      serviceName: 'serviceName',
      functionName: 'functionName',
      errorStream
    });

    s.pipe(transform);

    errorStream.on('finish', () => {
      const result = errorStream.toString();
      expect(result).to.eql(testNormal);
      
      done();
    });
  });

  it('test .so tips', (done) => {

    const errorMEssage = 'error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory';

    const errorStream = new streams.WritableStream();

    const Readable = require('stream').Readable;
    const s = new Readable();
    s._read = () => {
      s.push(errorMEssage);
      s.push(null);
    };

    const transform = processorTransformFactory({
      serviceName: 'serviceName',
      functionName: 'functionName',
      errorStream
    });

    s.pipe(transform);

    errorStream.on('finish', () => {
      const result = errorStream.toString();
      expect(result).to.eql(errorMEssage);
      assert.calledWith(httpx.request, 'https://packages.debian.org/search?lang=en&suite=jessie&arch=amd64&mode=path&searchon=contents&keywords=libnss3.so', {
        timeout: 10000
      });

      assert.calledWith(httpx.read, 'response', 'utf8');
      
      done();
    });
  });
});