'use strict';

const path = require('path');
const _ = require('lodash');

const getTpl = require('../../tpl').getTpl;



async function resolveNasConfig(tplPath, serviceName, serviceRes) {
  const properties = (serviceRes.Properties || {});
  
  const nasConfig = properties.NasConfig;

  if (!nasConfig) { return []; }

  const tplFolder = path.dirname(tplPath);

  const mountPoints = nasConfig.MountPoints;

  let mountsLocalPath = new Map();

  if (mountPoints) {
    for (let mountPoint of mountPoints) {
      // '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
      const serverAddr = mountPoint.ServerAddr;
      const mntDir = mountPoint.MountDir;
      const suffix = '.com:';
      const index = serverAddr.lastIndexOf(suffix);

      let mountSource = serverAddr.substr(index + suffix.length);
      // 012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com
      let serverPath = serverAddr.substr(0, serverAddr.length - mountSource.length - 1);

      const nasDir = path.join(tplFolder, '.fun', 'nas', serverPath);

      const localNasDir = path.join(nasDir, mountSource);

      mountsLocalPath.set(mntDir, localNasDir);
    }
  } else if (_.isEqual(nasConfig, 'Auto')) {
    console.log('nas auto dose not support now');
  }

  return mountsLocalPath;
}

async function info(tplPath) {


  const tpl = await getTpl(tplPath);  
  let map = new Map();
  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      await resolveNasConfig(tplPath, name, resource).then(function(nasLocalPaths) {
        map.set(name, nasLocalPaths);
      });
    } 
  }
  return map;
}

module.exports = { info, resolveNasConfig };