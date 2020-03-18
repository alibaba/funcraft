'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:nas:cp');

const { red, green } = require('colors');
const { extractZipTo } = require('../package/zip');
const { isDir, isFile } = require('./cp/file');
const { writeBufToFile } = require('./cp/file');
const { deployNasService } = require('./init');
const { uploadFolder, uploadFile } = require('./cp/upload');
const { getNasHttpTriggerPath, statsRequest } = require('./request');
const { resolveLocalPath, isNasProtocol, endWithSlash } = require('./path');
const { sendCleanRequest, sendZipRequest, sendDownLoadRequest } = require('./request');
const { checkWritePerm, getNasId, getNasPathAndServiceFromNasUri } = require('./support');

async function checkCpDstPath(srcPath, dstStats, recursive, noClobber, nasHttpTriggerPath, noTargetDirectory = false) {
  const { resolvedDst, dstPath, dstPathExists, parentDirOfDstPathExists, dstPathIsDir, dstPathIsFile, dstPathEndWithSlash } = dstStats;

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
      const newDstPath = path.posix.join(resolvedDst, path.basename(srcPath));
      const statsRes = await statsRequest(newDstPath, nasHttpTriggerPath);
      const stats = statsRes.data;
      const newDstStats = {
        dstPath: `${dstPath}/${path.basename(srcPath)}`,
        resolvedDst: newDstPath,
        dstPathEndWithSlash: false,
        dstPathExists: stats.exists,
        parentDirOfDstPathExists: stats.parentDirExists,
        dstPathIsDir: stats.isDir,
        dstPathIsFile: stats.isFile
      };

      return await checkCpDstPath(srcPath, newDstStats, recursive, noClobber, nasHttpTriggerPath);
    }

    if (dstPathIsDir && !isNasProtocol(dstPath)) {
      // TO DO: 目标路径是本地路径
      return path.join(resolvedDst, path.basename(srcPath));
    }
  } else if (!recursive && !dstPathExists) {
    if (dstPathEndWithSlash) { errorInf = `nas cp: cannot create regular file ${dstPath}: Not a directory`; }
    else if (parentDirOfDstPathExists) { return resolvedDst; }
    else { errorInf = `nas cp: cannot create regular file ${dstPath}: No such file or directory`; }

  } else if (recursive && dstPathExists) {
    if (dstPathIsDir && isNasProtocol(dstPath)) {
      if (noTargetDirectory) {
        return resolvedDst;
      }
      return path.posix.join(resolvedDst, path.basename(srcPath));
    }
    if (dstPathIsDir && !isNasProtocol(dstPath)) {
      return path.join(resolvedDst, path.basename(srcPath));
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

async function cpFromNasToLocal(nasPath, localDir, tpl) {

  const { nasPath: resolveNasPath, serviceName } = getNasPathAndServiceFromNasUri(nasPath, tpl);
  const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);

  console.log(`  zipping ${resolveNasPath}`);
  const tmpNasZipPath = path.posix.join(path.dirname(resolveNasPath), `.fun-nas-generated.zip`);
  await sendZipRequest(nasHttpTriggerPath, resolveNasPath, tmpNasZipPath);
  console.log(`${green('✔')} zip done`);

  console.log('  downloading...');
  const localZipPath = path.join(process.cwd(), '.fun', 'nas', '.fun-nas-generated.zip');
  const rs = await sendDownLoadRequest(nasHttpTriggerPath, tmpNasZipPath);
  console.log(`${green('✔')} download done`);

  await writeBufToFile(localZipPath, rs.data);

  console.log('  unzipping file');
  await extractZipTo(localZipPath, path.resolve(localDir));
  console.log(`${green('✔')} unzip done`);

  // clean
  await sendCleanRequest(nasHttpTriggerPath, tmpNasZipPath);
  await fs.remove(localZipPath);

  console.log(`${green('✔')} download completed`);
}

async function cpFromLocalToNas({
  baseDir, tpl, tplPath, localPath,
  dstPath, localNasTmpDir, isSync,
  recursive, noClobber, noTargetDirectory
}) {
  const { nasPath, serviceName } = getNasPathAndServiceFromNasUri(dstPath, tpl);
  // fun nas init
  await deployNasService(baseDir, tpl, serviceName, tplPath);

  // 这里将 path.resolve(srcPath) 传进去, 是因为在 windows 平台上利用 git bash 输入的本地路径问题
  // git bash 读取 windows 本地路径是以 '/' 作为分隔符的, 因此在此处需要将其转换为以 '\'作为分隔符
  const resolvedSrc = resolveLocalPath(path.resolve(localPath));

  if (!await fs.pathExists(resolvedSrc)) {
    throw new Error(`${resolvedSrc} not exist`);
  }

  const srcPathIsDir = await isDir(resolvedSrc);
  const srcPathIsFile = await isFile(resolvedSrc);

  if (srcPathIsDir && !recursive) {
    throw new Error('Can not copy folder without option -r/--recursive');
  }

  const nasId = getNasId(tpl, serviceName);
  const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);

  debug(`checking dst path ${dstPath}...`);
  const statsRes = await statsRequest(nasPath, nasHttpTriggerPath);
  const stats = statsRes.data;

  const dstStats = {
    dstPath: dstPath,
    resolvedDst: nasPath,
    dstPathEndWithSlash: endWithSlash(nasPath),
    dstPathExists: stats.exists,
    parentDirOfDstPathExists: stats.parentDirExists,
    dstPathIsDir: stats.isDir,
    dstPathIsFile: stats.isFile
  };

  let actualDstPath = await checkCpDstPath(resolvedSrc, dstStats, recursive, noClobber, nasHttpTriggerPath, noTargetDirectory);

  if (isSync && srcPathIsDir) { actualDstPath = nasPath; }

  const permTip = checkWritePerm(stats, nasId, nasPath);
  if (permTip) {
    console.log(red(`Warning: ${permTip}`));
  }

  if (srcPathIsDir) {
    await uploadFolder(resolvedSrc, actualDstPath, nasHttpTriggerPath, localNasTmpDir, noClobber);
  } else if (srcPathIsFile) {
    await uploadFile(resolvedSrc, actualDstPath, nasHttpTriggerPath);
  } else {
    throw new Error(`${localPath} has the same file stat and folder stat`);
  }
}

async function cp(srcPath, targetPath, recursive, noClobber, localNasTmpDir, tpl, tplPath, baseDir, isSync, noTargetDirectory = false) {
  if (srcPath === undefined || targetPath === undefined) {
    console.log('Input path empty error, please input again!');
    return;
  }
  debug('cp ' + (recursive ? '-r ' : '') + srcPath + ' to ' + targetPath);

  if (isNasProtocol(srcPath) && !isNasProtocol(targetPath)) {

    await cpFromNasToLocal(srcPath, targetPath, tpl);
  } else if (!isNasProtocol(srcPath) && isNasProtocol(targetPath)) {

    await cpFromLocalToNas({ localPath: srcPath, dstPath: targetPath,
      baseDir, tpl, tplPath, localNasTmpDir,
      isSync, recursive, noClobber, noTargetDirectory
    });
  } else if (isNasProtocol(srcPath) && isNasProtocol(targetPath)) {
    //nas => nas
    throw new Error('Not support copy NAS files to another NAS!');
  } else {
    throw new Error('Format of path not support');
  }
}

module.exports = cp;
