'use strict';

const zip = require('../../package/zip');
const _ = require('lodash');

async function isSpringBootJar(jarfilePath) {
  try {
    const data = await zip.readZipFile(jarfilePath, 'META-INF/MANIFEST.MF');
    const content = data.toString();

    return _.includes(content, 'Spring-Boot-Version');
  } catch (e) {
    return false;
  }
}

module.exports = {
  isSpringBootJar
};