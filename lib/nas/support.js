'use strict';
const { getTpl } = require('../tpl');
const { findServices } = require('../definition');
const { red } = require('colors');

async function getDefaultService(tplPath) {
  const tpl = await getTpl(tplPath);
  const services = findServices(tpl.Resources);

  if (services.length === 1) {
    return services[0].serviceName;
  }
  throw new Error(red('There should be one and only one service in your template.[yml|yaml].'));
}
function chunk(arr, size) {
  return Array(Math.ceil(arr.length / size)).fill().map((_, i) => arr.slice(i * size, i * size + size));
}

function splitRangeBySize(start, end, chunkSize) {
  if (chunkSize === 0) {
    throw new Error('chunkSize of function splitRangeBySize should not be 0');
  }
  const res = [];
  while (start < end) {
    const size = Math.min(chunkSize, end - start);
    res.push({
      start,
      size 
    });
    start = start + size;
  }
  return res;
}

function getIdInfoFromNasConfig(nasConfig) {
  if (nasConfig === 'Auto') {
    return {
      uid: 10003, 
      gid: 10003
    };
  } 
  return {
    uid: nasConfig.UserId, 
    gid: nasConfig.GroupId
  };
}

module.exports = { 
  getDefaultService, 
  chunk, 
  splitRangeBySize, 
  getIdInfoFromNasConfig };