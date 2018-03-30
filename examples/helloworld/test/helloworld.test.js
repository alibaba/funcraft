'use strict';

const { test } = require('fc-helper');
const expect = require('expect.js');

const handler = require('../helloworld.js');

describe('hello world', function () {
  it('should ok', async () => {
    const res = await test(handler.index).run('{}', '{}');
    expect(res.statusCode).to.be(200);
    expect(res.body).to.be('Hello Function Compute & API Gateway!');
  });
});
