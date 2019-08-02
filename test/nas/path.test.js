'use strict';

const expect = require('expect.js');

const { parseNasPath } = require('../../lib/nas/path');

describe('parseNasPath test', () => {
  it('valid nas path', () => {
    const nasPath = 'nas://demo://mnt/nas';
    let res = parseNasPath(nasPath);
    expect(res).to.eql({nasPath: '/mnt/nas', serviceName: 'demo'});
  });
});
