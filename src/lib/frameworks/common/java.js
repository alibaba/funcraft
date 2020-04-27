'use strict';

const zip = require('../../package/zip');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const httpx = require('httpx');
const tmpDir = require('temp-dir');

async function isSpringBootJar(jarfilePath) {
  try {
    const data = await zip.readZipFile(jarfilePath, 'META-INF/MANIFEST.MF');
    const content = data.toString();

    return _.includes(content, 'Spring-Boot-Version');
  } catch (e) {
    return false;
  }
}

async function downloadJetty(codeDir) {
  const dotFunPath = path.join(codeDir, '.fun');
  let zipName = await fs.readFile(path.join(__dirname, '..', 'support', 'war', 'ZIPNAME'), 'utf8');
  zipName = zipName.split(/\r?\n/)[0];
  const url = `https://gosspublic.alicdn.com/fun/frameworks/support/${zipName}`;
  const downloadPath = path.join(tmpDir, zipName);
  
  console.log(`downloading zip which contains jetty from ${url} to ${downloadPath}...`);

  if (!await fs.pathExists(downloadPath)) {
    const writeStream = fs.createWriteStream(downloadPath);
  
    const response = await httpx.request(url, { timeout: 36000000, method: 'GET' }); // 10 hours
    await new Promise((resolve, reject) => {
      response.pipe(writeStream).on('error', err => {
        fs.removeSync(downloadPath);
        reject(err);
      }).on('finish', resolve);
    });
  }

  console.log('extract zip which contains jetty to custom runtime...');
  await zip.extractZipTo(downloadPath, dotFunPath);
}

module.exports = {
  isSpringBootJar,
  downloadJetty
};