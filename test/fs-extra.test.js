let fs = require('fs-extra');
let path = require('path');
const expect = require('expect.js');

describe('fs-extra module Tests', function () {

  it('should exists', function () {
    let p = path.resolve(__dirname, '../LICENSE');
    expect(fs.pathExistsSync(p)).to.be(true);
    console.log(fs.readFileSync(p, 'utf-8'));
  });

  it('should not exists', function () {
    let p = path.resolve(__dirname, '-----BEGIN RSA PRIVATE KEY-----');
    expect(fs.pathExistsSync(p)).to.be(false);
  });
});
