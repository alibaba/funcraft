'use strict';

const path = require('path');

const expect = require('expect.js');

const zip = require('../lib/zip');

describe('zip', () => {
  it('should ok', async function () {
    var base64 = await zip([
      'file1.txt'
    ], path.join(__dirname, 'figures'));
    expect(base64).to.be('UEsDBBQACAAIACIxAUsAAAAAAAAAAAAAAAAJAAAAZmlsZTEudHh080jNyclXKM8vyklR5AIAUEsHCEHkqbIPAAAADQAAAFBLAQItAxQACAAIACIxAUtB5KmyDwAAAA0AAAAJAAAAAAAAAAAAIACkgQAAAABmaWxlMS50eHRQSwUGAAAAAAEAAQA3AAAARgAAAAAA');
  });
});
