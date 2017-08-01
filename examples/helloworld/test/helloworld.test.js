'use strict';

const expect = require('expect.js');

const handler = require('../helloworld.js');

describe('hello world', function () {
  it('should ok', (done) => {
    handler.index({}, {}, function (err, data) {
      expect(err).to.not.be.ok();
      expect(data.body).to.be('Hello world!\n');
      done();
    });
  });
});
