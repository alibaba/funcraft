'use strict';

const { test } = require('fc-helper');
const expect = require('expect.js');

const { handler } = require('../index.js');

describe('hello world', function () {
  it('should ok', async () => {
    const info = await test(handler).run('{}', '{}');
    expect(info).to.have.property('location');
    expect(info).to.have.property('daily');
    expect(info).to.have.property('last_update');
  });
});
