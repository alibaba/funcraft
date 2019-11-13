'use strict';

const { resolveLocalPath, isNasProtocol, endWithSlash } = require('./path');
const debug = require('debug')('fun:nas:cp');
const { isDir, isFile, isEmptyDir } = require('./cp/file');
const { uploadFolder, uploadFile } = require('./cp/upload');
const { getNasHttpTriggerPath, statsRequest } = require('./request');
const { checkWritePerm, getNasId, getNasPathAndServiceFromNasUri } = require('./support');
const { red } = require('colors');
const fs = require('fs-extra');
const path = require('path');
const { deployNasService } = require('./init');

async function cp(srcPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync) {
  if (srcPath === undefined || dstPath === undefined) {
    console.log('Input path empty error, please input again!');
    return;
  }

  debug('cp ' + (recursive ? '-r ' : '') + srcPath + ' to ' + dstPath);

  if (isNasProtocol(srcPath) && !isNasProtocol(dstPath)) {
    //nas => local
    throw new Error('Not support NAS file download now!');
  } else if (!isNasProtocol(srcPath) && isNasProtocol(dstPath)) {
    //local => nas
    const { nasPath: resolvedDst, serviceName } = getNasPathAndServiceFromNasUri(dstPath, tpl);
    // fun nas init 操作
    await deployNasService(baseDir, tpl, serviceName);
    debug(`checking src path ${srcPath}`);

    // 这里将 path.resolve(srcPath) 传进去, 是因为在 windows 平台上利用 git bash 输入的本地路径问题
    // git bash 读取 windows 本地路径是以 '/' 作为分隔符的, 因此在此处需要将其转换为以 '\'作为分隔符
    const resolvedSrc = resolveLocalPath(path.resolve(srcPath));
  
    const srcPathExists = fs.existsSync(resolvedSrc);
    let srcPathIsDir;
    let srcPathIsFile;
    if (srcPathExists) {
      srcPathIsDir = await isDir(resolvedSrc);
      srcPathIsFile = await isFile(resolvedSrc);
    }
    var srcPathIsEmpthDir;
    if (srcPathIsDir) {
      srcPathIsEmpthDir = await isEmptyDir(resolvedSrc);
    }
    const srcStats = {
      srcPath, 
      resolvedSrc, 
      srcPathExists, 
      srcPathIsDir, 
      srcPathIsFile, 
      srcPathIsEmpthDir
    };
    checkCpSrcPath(srcStats, recursive);

    const nasId = getNasId(tpl, serviceName);
    const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);

    debug(`checking dst path ${dstPath}...`);

    const statsRes = await statsRequest(resolvedDst, nasHttpTriggerPath);
    const stats = statsRes.data;
    const dstPathEndWithSlash = endWithSlash(resolvedDst);

    const dstStats = { 
      dstPath, 
      resolvedDst, 
      dstPathEndWithSlash, 
      dstPathExists: stats.exists, 
      parentDirOfDstPathExists: stats.parentDirExists, 
      dstPathIsDir: stats.isDir, 
      dstPathIsFile: stats.isFile
    };
    
    var actualDstPath = await checkCpDstPath(srcStats, dstStats, recursive, noClobber, nasHttpTriggerPath);

    if (isSync) { actualDstPath = resolvedDst; }
    
    const permTip = checkWritePerm(stats, nasId, resolvedDst);
    if (permTip) {
      console.log(red(`Warning: ${permTip}`));
    }
    
    if (srcStats.srcPathIsDir) {
      await uploadFolder(resolvedSrc, actualDstPath, nasHttpTriggerPath, localNasTmpDir, noClobber);
    } else if (srcStats.srcPathIsFile) {
      await uploadFile(resolvedSrc, actualDstPath, nasHttpTriggerPath);
    } else {
      throw new Error(`${srcStats.srcPath} has the same file stat and folder stat`);
    }
    
  } else if (isNasProtocol(srcPath) && isNasProtocol(dstPath)) {
    //nas => nas
    throw new Error('Not support copy NAS files to another NAS!');
  } else {
    throw new Error('Format of path not support');
  }
}

function checkCpSrcPath(srcStats, recursive) {
  const { srcPath, srcPathExists, srcPathIsDir, srcPathIsEmpthDir } = srcStats;

  if (!srcPathExists) {
    throw new Error(`${srcPath} not exist`);
  }
  
  if (srcPathIsDir && !recursive) {
    throw new Error('Can not copy folder without option -r/--recursive');
  }

  if (srcPathIsDir && srcPathIsEmpthDir) {
    throw new Error(`${srcPath} is empty, skip uploading`);
  }
}

async function checkCpDstPath(srcStats, dstStats, recursive, noClobber, nasHttpTriggerPath) {
  const { resolvedDst, dstPath, dstPathExists, parentDirOfDstPathExists, dstPathIsDir, dstPathIsFile, dstPathEndWithSlash } = dstStats;
  const { resolvedSrc, srcPath } = srcStats;

  var errorInf;
  if (!recursive && dstPathExists) {
    
    if (dstPathIsFile && !dstPathEndWithSlash) {
      if (!noClobber) { return resolvedDst; }
      errorInf = `${dstPath} already exists.`;
    }

    if (dstPathIsFile && dstPathEndWithSlash) { 
      errorInf = `${dstPath} : Not a directory`; 
    }
    
    if (dstPathIsDir && isNasProtocol(dstPath)) {
      const newDstPath = path.posix.join(resolvedDst, path.basename(resolvedSrc));
      const statsRes = await statsRequest(newDstPath, nasHttpTriggerPath);
      const stats = statsRes.data;
      const newDstStats = {
        dstPath: `${dstPath}/${path.basename(resolvedSrc)}`,
        resolvedDst: newDstPath,
        dstPathEndWithSlash: false,
        dstPathExists: stats.exists,
        parentDirOfDstPathExists: stats.parentDirExists,
        dstPathIsDir: stats.isDir,
        dstPathIsFile: stats.isFile
      };
      
      return await checkCpDstPath(srcStats, newDstStats, recursive, noClobber, nasHttpTriggerPath);
    }

    if (dstPathIsDir && !isNasProtocol(dstPath)) {
      // TO DO: 目标路径是本地路径
      return path.join(resolvedDst, path.basename(resolvedSrc));
    }
  } else if (!recursive && !dstPathExists) {
    if (dstPathEndWithSlash) { errorInf = `nas cp: cannot create regular file ${dstPath}: Not a directory`; }
    else if (parentDirOfDstPathExists) { return resolvedDst; }
    else { errorInf = `nas cp: cannot create regular file ${dstPath}: No such file or directory`; }

  } else if (recursive && dstPathExists) {
    if (dstPathIsDir && isNasProtocol(dstPath)) {
      return path.posix.join(resolvedDst, path.basename(resolvedSrc));
    }
    if (dstPathIsDir && !isNasProtocol(dstPath)) {
      return path.join(resolvedDst, path.basename(resolvedSrc));
    }
    if (dstPathIsFile && dstPathEndWithSlash) {
      errorInf = `nas cp: failed to access ${dstPath}: Not a directory`;
    }
    if (dstPathIsFile && !dstPathEndWithSlash) {
      errorInf = `nas cp: cannot overwrite non-directory ${dstPath} with directory ${srcPath}`;
    }
  } else if (recursive && !dstPathExists) {
    if (parentDirOfDstPathExists) {
      return resolvedDst;
    }
    errorInf = `nas cp: cannot create directory ${dstPath}: No such file or directory`;
  }
  throw new Error(errorInf);
}

module.exports = cp;
