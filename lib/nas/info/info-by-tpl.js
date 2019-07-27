'use strict';

const path = require('path');
const _ = require('lodash');

const getTpl = require('../../tpl').getTpl;



async function resolveNasConfig(tplPath, serviceName, serviceRes) {
  const properties = (serviceRes.Properties || {});
  
  const nasConfig = properties.NasConfig;

  if (!nasConfig) { return []; }

  let mountsLocalPath = new Map();
  const tplFolder = path.dirname(tplPath);

  const mountPoints = nasConfig.MountPoints;

  if (mountPoints) {
    for (let mountPoint of mountPoints) {
      
      const serverAddr = mountPoint.ServerAddr;
      const mntDir = mountPoint.MountDir;
      const suffix = '.com:';
      const index = serverAddr.lastIndexOf(suffix);

      const mountSource = serverAddr.substr(index + suffix.length);
      
      const serverPath = serverAddr.substr(0, serverAddr.length - mountSource.length - 1);

      const nasDir = path.join(tplFolder, '.fun', 'nas', serverPath);

      const localNasDir = path.join(nasDir, mountSource);

      mountsLocalPath.set(mntDir, localNasDir);
    }
  } else if (_.isEqual(nasConfig, 'Auto')) {
    const localNasDir = path.join(tplFolder, '.fun', 'nas', 'auto-default');
    const mntDir = '/mnt/auto-nas';
    mountsLocalPath.set(mntDir, localNasDir);
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