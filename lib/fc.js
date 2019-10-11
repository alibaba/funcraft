'use strict';

const { getFcClient } = require('./client');
const vpc = require('./vpc');
const nas = require('./nas');

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:fc');
const zip = require('./package/zip');
const { green, red, yellow } = require('colors');
const { addEnv, resolveLibPathsFromLdConf } = require('./install/env');
const funignore = require('./package/ignore');
const _ = require('lodash');
const bytes = require('bytes');
const { sleep } = require('./time');

const definition = require('./definition');

const promiseRetry = require('./retry');

const FUN_GENERATED_SERVICE = 'fun-generated-default-service';

const defaultVpcConfig = {
  securityGroupId: '',
  vSwitchIds: [],
  vpcId: ''
};

const defaultNasConfig = {
  UserId: -1,
  GroupId: -1,
  MountPoints: []
};

function generateFunIngore(baseDir, codeUri) {
  const absCodeUri = path.resolve(baseDir, codeUri);
  const absBaseDir = path.resolve(baseDir);

  const relative = path.relative(absBaseDir, absCodeUri);

  if (codeUri.startsWith('..') || relative.startsWith('..')) {
    console.warn(red(`\t\twarning: funignore is not supported for your CodeUri: ${codeUri}`));
    return null;
  }

  return funignore(baseDir);
}

const runtimeTypeMapping = {
  'nodejs6': 'node_modules',
  'nodejs8': 'node_modules',
  'python2.7': ['.egg-info', '.dist-info', '.fun'],
  'python3': ['.egg-info', '.dist-info', '.fun'],
  'php7.2': ['extension', 'vendor']
};

async function detectLibraryFolders(dirName, libraryFolders, childDir, wrap, functionName) {
  if (Array.isArray(libraryFolders)) {
    for (const iterator of libraryFolders) {
      for (const name of childDir) {
        if (_.endsWith(name, iterator)) {
          console.warn(red(`${wrap}Fun detected that the library directory '${name}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`));
          return;
        }
      }
    }
  } else {
    if (childDir.includes(libraryFolders)) {
      console.warn(red(`${wrap}Fun detected that the library directory '${libraryFolders}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`));
    } else {

      const funDir = childDir.filter(p => p === '.fun');
      if (Array.isArray(funDir) && funDir.length > 0) {

        const childFun = await fs.readdir(path.join(dirName, '.fun'));

        if (childFun.includes('root')) {

          console.warn(red(`${wrap}Fun detected that the library directory '.fun/root' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`));

        }
      }
    }
  }
}

async function detectLibrary(codeUri, runtime, baseDir, functionName, wrap = '') {
  const absoluteCodePath = path.resolve(baseDir, codeUri);
  
  const stats = await fs.lstat(absoluteCodePath);
  if (stats.isFile()) {
    let libraryFolders = runtimeTypeMapping[runtime];

    const dirName = path.dirname(absoluteCodePath);
    const childDir = await fs.readdir(dirName);

    await detectLibraryFolders(dirName, libraryFolders, childDir, wrap, functionName);
  }
}

function extractOssCodeUri(ossUri) {
  const prefixLength = 'oss://'.length;

  const index = ossUri.indexOf('/', prefixLength);

  return {
    ossBucketName: ossUri.substring(prefixLength, index),
    ossObjectName: ossUri.substring(index + 1)
  };
}

async function zipCode(baseDir, codeUri, runtime, functionName) {
  let codeAbsPath;

  if (codeUri) {
    codeAbsPath = path.resolve(baseDir, codeUri);

    if (codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war')) {
      return { base64: Buffer.from(await fs.readFile(codeAbsPath)).toString('base64') };
    }
  } else {
    codeAbsPath = path.resolve(baseDir, './');
  }

  const ignore = generateFunIngore(baseDir, codeAbsPath);

  await detectLibrary(codeAbsPath, runtime, baseDir, functionName, '\t\t');

  return await zip.pack(codeAbsPath, ignore);
}

async function makeFunction(baseDir, {
  serviceName,
  functionName,
  description = '',
  handler,
  initializer = '',
  timeout = 3,
  initializationTimeout = 3,
  memorySize = 128,
  runtime = 'nodejs6',
  codeUri,
  environmentVariables = {},
  nasConfig
}, onlyConfig) {
  const fc = await getFcClient();

  var fn;
  try {
    fn = await fc.getFunction(serviceName, functionName);
  } catch (ex) {
    if (ex.code !== 'FunctionNotFound') {
      throw ex;
    }
  }

  if (!fn && onlyConfig) {

    throw new Error(`\nFunction '` + `${serviceName}` + '/' + `${functionName}` + `' was detected as the first deployment, and the code package had to be uploaded when creating the function. You can ` + yellow(`either`) + ` re-execute the command to remove the -u(--update-config)` + ` option ` + yellow(`or`) + ` execute 'fun deploy ${serviceName}/${functionName}' before doing so.`);
  }

  let code;

  if (!onlyConfig) { // ignore code
   
    if (codeUri && codeUri.startsWith('oss://')) { // oss://my-bucket/function.zip
      code = extractOssCodeUri(codeUri);
    } else {
      console.log(`\t\tWaiting for packaging function ${functionName} code...`);
      const { base64, count, compressedSize } = await zipCode(baseDir, codeUri, runtime, functionName);

      const convertedSize = bytes(compressedSize, {
        unitSeparator: ' '
      });
      
      if (!count || !compressedSize) {
        console.log(green(`\t\tThe function ${functionName} has been packaged.`));
      } else {
        console.log(green(`\t\tThe function ${functionName} has been packaged. A total of ` + yellow(`${count}`) + `${count === 1 ? ' file' : ' files'}` + ` files were compressed and the final size was` + yellow(` ${convertedSize}`)));
      }

      code = {
        zipFile: base64
      };
    }
  }

  const confEnv = await resolveLibPathsFromLdConf(baseDir, codeUri);

  Object.assign(environmentVariables, confEnv);

  const params = {
    description,
    handler,
    initializer,
    timeout,
    initializationTimeout,
    memorySize,
    runtime,
    code,
    environmentVariables: addEnv(environmentVariables, nasConfig)
  };

  for (let i in params.environmentVariables) {
    if (!isNaN(params.environmentVariables[i])) {
      debug(`the value in environmentVariables:${params.environmentVariables[i]} cast String Done`);
      params.environmentVariables[i] = params.environmentVariables[i] + '';
    }
  }

  try {

    if (!fn) {
      // create
      params['functionName'] = functionName;
      fn = await fc.createFunction(serviceName, params);
    } else {
      // update
      fn = await fc.updateFunction(serviceName, functionName, params);
    }
  } catch (ex) {

    if (ex.message.indexOf('timeout') !== -1) {

      throw new Error(`\nError message: ${ex.message}.\n\n` + red(`This error may be caused by network latency. You can set the client timeout to a larger value through 'fun config' and try again.`));
    }
    throw ex;
  }

  return fn;
}

async function makeService({
  serviceName,
  role,
  description,
  internetAccess = true,
  logConfig = {},
  vpcConfig,
  nasConfig
}) {
  const fc = await getFcClient();

  var service;
  await promiseRetry(async (retry, times) => {
    try {
      service = await fc.getService(serviceName);
    } catch (ex) {

      if (ex.code === 'AccessDenied' || !ex.code || ex.code === 'ENOTFOUND') {

        if (ex.message.indexOf('the caller is not authorized to perform') !== -1) {

          console.error(red(`\nMaybe you need grant AliyunRAMFullAccess policy to the subuser or use the primary account. You can refer to Chinese doc https://github.com/aliyun/fun/blob/master/docs/usage/faq-zh.md#nopermissionerror-you-are-not-authorized-to-do-this-action-resource-acsramxxxxxxxxxxrole-action-ramgetrole or English doc https://github.com/aliyun/fun/blob/master/docs/usage/faq.md#nopermissionerror-you-are-not-authorized-to-do-this-action-resource-acsramxxxxxxxxxxrole-action-ramgetrole for help.\n\nIf you don’t want use the AliyunRAMFullAccess policy or primary account, you can also specify the Role property for Service. You can refer to Chinease doc https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice or Enaglish doc https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md#aliyunserverlessservice for help.\n`));

        } else if (ex.message.indexOf('FC service is not enabled for current user') !== -1) {

          console.error(red(`\nFC service is not enabled for current user. Please enable FC service before using fun.\nYou can enable FC service on this page https://www.aliyun.com/product/fc .\n`));

        } else {
          console.error(red(`\nThe accountId you entered is incorrect. You can only use the primary account id, whether or not you use a sub-account or a primary account ak. You can get primary account ID on this page https://account.console.aliyun.com/#/secure .\n`));
        }

        throw ex;
      } else if (ex.code !== 'ServiceNotFound') {
        debug('error when getService, serviceName is %s, error is: \n%O', serviceName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  });

  const options = {
    description,
    role,
    logConfig: {
      project: logConfig.Project || '',
      logstore: logConfig.Logstore || ''
    }
  };

  if (internetAccess !== null) {
    // vpc feature is not supported in some region
    Object.assign(options, {
      internetAccess
    });
  }
  
  const isNasAuto = definition.isNasAutoConfig(nasConfig);
  const isVpcAuto = definition.isVpcAutoConfig(vpcConfig);

  if (!_.isEmpty(vpcConfig) || isNasAuto) {

    if (isVpcAuto || (_.isEmpty(vpcConfig) && isNasAuto)) {
      console.log('\tusing \'VpcConfig: Auto\', Fun will try to generate related vpc resources automatically');
      vpcConfig = await vpc.createDefaultVpcIfNotExist();
      console.log(green('\tgenerated auto VpcConfig done: ', JSON.stringify(vpcConfig)));

      debug('generated vpcConfig: %j', vpcConfig);
    }
  }

  Object.assign(options, {
    vpcConfig: vpcConfig || defaultVpcConfig
  });

  if (isNasAuto) {

    const vpcId = vpcConfig.vpcId;
    const vswitchId = _.head(vpcConfig.vswitchIds);

    console.log('\tusing \'NasConfig: Auto\', Fun will try to generate related nas file system automatically');
    nasConfig = await nas.generateAutoNasConfig(serviceName, vpcId, vswitchId);
    console.log(green('\tgenerated auto NasConfig done: ', JSON.stringify(nasConfig)));
  }

  Object.assign(options, {
    nasConfig: nasConfig || defaultNasConfig
  });

  await promiseRetry(async (retry, times) => {
    try {
      if (!service) {
        debug('create service %s, options is %j', serviceName, options);
        service = await fc.createService(serviceName, options);
      } else {
        debug('update service %s, options is %j', serviceName, options);
        service = await fc.updateService(serviceName, options);
      }
    } catch (ex) {
      debug('error when createService or updateService, serviceName is %s, options is %j, error is: \n%O', serviceName, options, ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  // make sure nas dir exist
  if (serviceName !== FUN_GENERATED_SERVICE
    && !_.isEmpty(nasConfig)
    && !_.isEmpty(nasConfig.MountPoints)) {

    await ensureNasDirExist({
      role, vpcConfig, nasConfig
    });
  }

  return service;
}

function mapMountPointDir(mountPoints, func) {
  let resolvedMountPoints = _.map(mountPoints, (mountPoint) => {
    const serverAddr = mountPoint.ServerAddr;

    const index = _.lastIndexOf(serverAddr, ':');
    if (index >= 0) {
      const mountPointDomain = serverAddr.substring(0, index);
      const remoteDir = serverAddr.substring(index + 1);
      const mountDir = mountPoint.MountDir;

      debug('remoteDir is: %s', remoteDir);

      return func(mountPointDomain, remoteDir, mountDir);
    }
  });

  resolvedMountPoints = _.compact(resolvedMountPoints);

  return resolvedMountPoints;
}

async function ensureNasDirExist({
  role,
  vpcConfig,
  nasConfig
}) {
  const mountPoints = nasConfig.MountPoints;
  const modifiedNasConfig = _.cloneDeep(nasConfig);

  modifiedNasConfig.MountPoints = mapMountPointDir(mountPoints, (mountPointDomain, remoteDir, mountDir) => {
    if (remoteDir !== '/') {
      return {
        ServerAddr: `${mountPointDomain}:/`,
        MountDir: `${mountDir}`
      };
    } return null;
  });

  const nasMountDirs = mapMountPointDir(mountPoints, (mountPointDomain, remoteDir, mountDir) => {
    if (remoteDir !== '/') {
      return { mountDir, remoteDir };
    } 
    return null;
  });

  debug('dirs need to check: %s', nasMountDirs);

  if (!_.isEmpty(nasMountDirs)) {
    let nasRemoteDirs = [];
    let nasDirsNeedToCheck = [];
    for (let nasMountDir of nasMountDirs) {
      nasRemoteDirs.push(nasMountDir.remoteDir);
      nasDirsNeedToCheck.push(path.posix.join(nasMountDir.mountDir, nasMountDir.remoteDir));
    }
    console.log(`\tChecking if nas directories ${nasRemoteDirs} exists, if not, it will be created automatically`);

    const utilFunctionName = await makeFcUtilsFunctionNasDirChecker(role, vpcConfig, modifiedNasConfig);
    await sleep(1000);
    await invokeFcUtilsFunction({
      functionName: utilFunctionName,
      event: JSON.stringify(nasDirsNeedToCheck)
    });
  
    console.log(green('\tChecking nas directories done', JSON.stringify(nasRemoteDirs)));
  } 
}

async function makeFcUtilsService(role, vpcConfig, nasConfig) {
  return await makeService({
    serviceName: FUN_GENERATED_SERVICE,
    role,
    description: 'generated by Funcraft',
    vpcConfig,
    nasConfig
  });
}

async function makeFcUtilsFunction({
  serviceName,
  functionName,
  codes,
  description = '',
  handler,
  timeout = 60,
  memorySize = 128,
  runtime = 'nodejs8'
}) {
  const fc = await getFcClient();

  var fn;
  try {
    fn = await fc.getFunction(serviceName, functionName);
  } catch (ex) {
    if (ex.code !== 'FunctionNotFound') {
      throw ex;
    }
  }

  const base64 = await zip.packFromJson(codes);

  let code = {
    zipFile: base64
  };

  const params = {
    description,
    handler,
    initializer: '',
    timeout,
    memorySize,
    runtime,
    code
  };

  if (!fn) {
    // create
    params['functionName'] = functionName;
    fn = await fc.createFunction(serviceName, params);
  } else {
    // update
    fn = await fc.updateFunction(serviceName, functionName, params);
  }

  return fn;
}

async function invokeFcUtilsFunction({
  functionName,
  event
}) {
  const fc = await getFcClient();
  const rs = await fc.invokeFunction(FUN_GENERATED_SERVICE, functionName, event, {
    'X-Fc-Log-Type': 'Tail'
  });

  if (rs.data !== 'OK') {
    const log = rs.headers['x-fc-log-result'];

    if (log) {
      const decodedLog = Buffer.from(log, 'base64');
      if ((decodedLog.toString().toLowerCase()).includes('permission denied')) {
        throw new Error(`fc utils function ${functionName} invoke error, error message is: ${decodedLog}\n${red('May be UserId and GroupId in NasConfig don\'t have enough \
permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md')}`);
      }
      throw new Error(`fc utils function ${functionName} invoke error, error message is: ${decodedLog}`);
    }
  }
}

async function getFcUtilsFunctionCode(filename) {
  return await fs.readFile(path.join(__dirname, 'utils', filename));
}

async function makeFcUtilsFunctionNasDirChecker(role, vpcConfig, nasConfig) {
  await makeFcUtilsService(role, vpcConfig, nasConfig);

  const functionName = 'nas_dir_checker';

  const functionCode = await getFcUtilsFunctionCode('nas-dir-check.js');

  const codes = {
    'index.js': functionCode
  };

  await makeFcUtilsFunction({
    serviceName: FUN_GENERATED_SERVICE,
    functionName: 'nas_dir_checker',
    codes,
    description: 'used for fun to ensure nas remote dir exist',
    handler: 'index.handler'
  });

  return functionName;
}


async function invokeFunction({
  serviceName,
  functionName,
  event,
  invocationType
}) {

  var rs;
  const fc = await getFcClient();

  if (invocationType === 'Sync') {

    rs = await fc.invokeFunction(serviceName, functionName, event, {
      'X-Fc-Log-Type': 'Tail',
      'X-Fc-Invocation-Type': invocationType
    });

    const log = rs.headers['x-fc-log-result'];

    if (log) {

      console.log(yellow('========= FC invoke Logs begin ========='));
      const decodedLog = Buffer.from(log, 'base64');
      console.log(decodedLog.toString());
      console.log(yellow('========= FC invoke Logs end ========='));

      console.log(green('\nFC Invoke Result:'));
      console.log(rs.data);
    }
  } else {

    rs = await fc.invokeFunction(serviceName, functionName, event, {
      'X-Fc-Invocation-Type': invocationType
    });

    console.log(green('✔ ') + `${serviceName}/${functionName} async invoke success.`);
  }

  return rs;
}

module.exports = {
  invokeFcUtilsFunction,
  makeFcUtilsFunctionNasDirChecker,
  FUN_GENERATED_SERVICE,
  makeService,
  makeFunction,
  zipCode,
  detectLibrary,
  getFcUtilsFunctionCode,
  invokeFunction,
  generateFunIngore
};