'use strict';

const path = require('path');
const fs = require('fs');

const expect = require('expect.js');

const zip = require('../../lib/package/zip');
const funignore = require('../../lib/package/ignore');
const JSZip = require('jszip');

describe('zip', () => {
  it.skip('should ok', async function () {
    var func = {
      codes: [
        'file1.txt',
        'file-with-exec-permission.sh',
        'file-with-link'
      ]
    };
    var base64 = await zip.compress(func, path.join(__dirname, 'figures'), 'local');
    require('fs').writeFileSync('./test.zip', base64, 'base64');
    expect(base64).to.be('UEsDBAoAAAAAADUpD0tB5KmyDQAAAA0AAAAJAAAAZmlsZTEudHh0SGVsbG8gd29ybGQhClBLAQIUAAoAAAAAADUpD0tB5KmyDQAAAA0AAAAJAAAAAAAAAAAAAAAAAAAAAABmaWxlMS50eHRQSwUGAAAAAAEAAQA3AAAANAAAAAAA');
  });

  it.skip('zip file', async function () {
    var base64 = await zip.pack(path.join(__dirname, 'figures', 'file1.txt'));
    console.log(base64);
  });

  it.skip('zip folder', async function () {
    var base64 = await zip.pack(path.join(__dirname, 'figures'));
    console.log(base64);
  });

  it.skip('zip folder with symlink', async function () {
    var base64 = await zip.pack(path.join('examples', 'helloworld'));

    fs.writeFile('base64.txt', base64, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log('The file was saved!');
    });
  });

  it('.funignore', async function() {
    var basePath = path.join('examples', 'package', 'funignore');
    var b64string = await zip.pack(basePath, funignore(basePath));
    var zipfile = await JSZip.loadAsync(b64string, { base64: true });
      
    expect(zipfile.files).to.only.have.keys('example.pdf', 'lib/', 'package.json', 'lib/.keep');
  });

});