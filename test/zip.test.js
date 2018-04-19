'use strict';

const path = require('path');

const expect = require('expect.js');

const zip = require('../lib/zip');

describe.skip('zip', () => {
  it('should ok', async function () {
    var func = {
      codes: [
        'file1.txt'
      ]
    };
    var base64 = await zip.compress(func, path.join(__dirname, 'figures'), 'local');
    require('fs').writeFileSync('./test.zip', base64, 'base64');
    expect(base64).to.be('UEsDBAoAAAAAADUpD0tB5KmyDQAAAA0AAAAJAAAAZmlsZTEudHh0SGVsbG8gd29ybGQhClBLAQIUAAoAAAAAADUpD0tB5KmyDQAAAA0AAAAJAAAAAAAAAAAAAAAAAAAAAABmaWxlMS50eHRQSwUGAAAAAAEAAQA3AAAANAAAAAAA');
  });
});