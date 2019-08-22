'use strict';
const fs = require('fs-extra');
const path = require('path');


async function readDockerSharedPaths() {

  const defaultFileSharingPaths = [
    '/Users', 
    '/Volumes', 
    '/private', 
    '/tmp'
  ];
  const USER_HOME = process.env.HOME || process.env.USERPROFILE;
  const settingsPath = path.join(USER_HOME, 'Library/Group Containers/group.com.docker/settings.json');
  
  const fileData = await fs.readFile(settingsPath, 'utf8');
  
  const settings = JSON.parse(fileData);
  
  if (settings.hasOwnProperty('defaultFileSharingPaths')) {
    return settings.defaultFileSharingPaths;
  }
  return defaultFileSharingPaths;
}

async function getMountPathsNotSharedToDocker(mounts) {
  
  const dockerSharedPaths = await readDockerSharedPaths();
  let mountPathsNotSharedToDocker = [];
  for (let mount of mounts) {
    const mountPath = mount.Source;
    let isMountPathSharedToDocker = false;
    for (let dockerSharedPath of dockerSharedPaths) {
      if (mountPath.startsWith(dockerSharedPath)) {
        isMountPathSharedToDocker = true;
        break;
      }
    }
    if (!isMountPathSharedToDocker) {
      mountPathsNotSharedToDocker.push(mountPath);
    }
  }
  return mountPathsNotSharedToDocker;
}

module.exports = { getMountPathsNotSharedToDocker };