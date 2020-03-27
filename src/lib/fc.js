'use strict';

const util = require('./import/utils');
const bytes = require('bytes');
const funignore = require('./package/ignore');
const definition = require('./definition');
const promiseRetry = require('./retry');
const getProfile = require('./profile').getProfile;
const securityGroup = require('./security-group');
const uuid = require('uuid');
const tmpDir = require('temp-dir');

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:fc');
const yaml = require('js-yaml');
const zip = require('./package/zip');
const vpc = require('./vpc');
const nas = require('./nas');
const nasCp = require('./nas/cp');
const getUuid = require('uuid-by-string');

const { sleep } = require('./time');
const { makeTrigger } = require('./trigger');
const { makeSlsAuto } = require('./deploy/deploy-support');
const { isNotEmptyDir } = require('./nas/cp/file');
const { updateTimestamps } = require('./utils/file');
const { green, red, yellow } = require('colors');
const { getFcClient, getEcsPopClient, getNasPopClient } = require('./client');
const { getTpl, getBaseDir, getNasYmlPath, getRootTplPath, getProjectTpl } = require('./tpl');
const { addEnv, mergeEnvs, resolveLibPathsFromLdConf, generateDefaultLibPath } = require('./install/env');
const { readFileFromNasYml, mergeNasMappingsInNasYml, getNasMappingsFromNasYml, extractNasMappingsFromNasYml } = require('./nas/support');

const _ = require('lodash');

const {
  promptForConfirmContinue,
  promptForMountTargets,
  promptForMountPoints,
  promptForFileSystems,
  promptForSecurityGroup,
  promptForInputContinue
} = require('./init/prompt');

const FUN_GENERATED_SERVICE = 'fun-generated-default-service';

const SYSTEM_DEPENDENCY_PATH = path.join('.fun', 'root');

const SUPPORT_RUNTIMES = ['nodejs6', 'nodejs8', 'nodejs10', 'python2.7', 'python3', 'java8', 'custom'];

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

// extract jar path from 'java -jar -Dserver.port=$PORT target/java-getting-started-1.0.jar'
const BOOTSTRAP_SPRING_BOOT_JAR_REGEX = new RegExp('(java .*?)-jar (.*?) ([0-9a-zA-Z./_-]+\\.jar)', 'm');

async function generateFunIngore(baseDir, codeUri, runtime) {
  const absCodeUri = path.resolve(baseDir, codeUri);
  const absBaseDir = path.resolve(baseDir);

  const relative = path.relative(absBaseDir, absCodeUri);

  if (codeUri.startsWith('..') || relative.startsWith('..')) {
    console.warn(red(`\t\twarning: funignore is not supported for your CodeUri: ${codeUri}`));
    return null;
  }

  return await funignore(baseDir, runtime);
}

// TODO: python runtime .egg-info and .dist-info
const runtimeTypeMapping = {
  'nodejs6': ['node_modules', '.fun/root'],
  'nodejs8': ['node_modules', '.fun/root'],
  'nodejs10': ['node_modules', '.fun/root'],
  'python2.7': ['.fun/python', '.fun/root'],
  'python3': ['.fun/python', '.fun/root'],
  'php7.2': ['extension', 'vendor', '.fun/root']
};

async function detectLibraryFolders(dirName, libraryFolders, wrap, functionName) {
  if (_.isEmpty(libraryFolders)) { return; }

  for (const libraryFolder of libraryFolders) {
    const libraryPath = path.join(dirName, libraryFolder);
    if (await fs.pathExists(libraryPath)) {
      console.warn(red(`${wrap}Fun detected that the library directory '${libraryFolder}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`));
      return;
    }
  }
}

async function detectLibrary(codeUri, runtime, baseDir, functionName, wrap = '') {
  const absoluteCodePath = path.resolve(baseDir, codeUri);

  const stats = await fs.lstat(absoluteCodePath);
  if (stats.isFile()) {
    let libraryFolders = runtimeTypeMapping[runtime];

    await detectLibraryFolders(path.dirname(absoluteCodePath), libraryFolders, wrap, functionName);
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

      const lstat = await fs.stat(codeAbsPath);
      return {
        base64: Buffer.from(await fs.readFile(codeAbsPath)).toString('base64'),
        compressedSize: lstat.size
      };
    }
  } else {
    codeAbsPath = path.resolve(baseDir, './');
  }

  const ignore = await generateFunIngore(baseDir, codeAbsPath, runtime);

  await detectLibrary(codeAbsPath, runtime, baseDir, functionName, '\t\t');

  return await zip.pack(codeAbsPath, ignore);
}

const NODE_RUNTIME_MAPPING = {
  'localDir': 'node_modules',
  'remoteDir': 'node_modules',
  'env': 'NODE_PATH',
  'defaultEnv': '/usr/local/lib/node_modules'
};

const PYTHON_RUNTIME_MAPPING = {
  'localDir': path.join('.fun', 'python'),
  'remoteDir': 'python',
  'env': 'PYTHONUSERBASE'
};

const JAVA_RUNTIME_MAPPING = {
  'localDir': path.join('.fun', 'build', 'artifacts'),
  'remoteDir': 'java',
  'env': 'CLASSPATH'
};

const CUSTOM_RUNTIME_JAVA_MAPPING = {
  'localDir': path.join('target', 'lib'),
  'remoteDir': 'java',
  'env': 'CLASSPATH',
  'pathSuffix': '*'
};

const FONTS_MAPPING = {
  'localDir': 'fonts',
  'remoteDir': 'fonts'
};

const runtimeDependencyMappings = {
  'nodejs6': [NODE_RUNTIME_MAPPING, FONTS_MAPPING],
  'nodejs8': [NODE_RUNTIME_MAPPING, FONTS_MAPPING],
  'nodejs10': [NODE_RUNTIME_MAPPING, FONTS_MAPPING],
  'python2.7': [PYTHON_RUNTIME_MAPPING, FONTS_MAPPING],
  'python3': [PYTHON_RUNTIME_MAPPING, FONTS_MAPPING],
  'java8': [JAVA_RUNTIME_MAPPING, FONTS_MAPPING],
  'custom': [NODE_RUNTIME_MAPPING, PYTHON_RUNTIME_MAPPING, CUSTOM_RUNTIME_JAVA_MAPPING, FONTS_MAPPING]
};

async function saveNasMappings(nasYmlPath, nasMappings) {
  if (_.isEmpty(nasMappings)) { return {}; }

  const contentObj = await readFileFromNasYml(nasYmlPath);

  const mergedNasMappings = await mergeNasMappingsInNasYml(nasYmlPath, nasMappings);

  contentObj.nasMappings = mergedNasMappings;

  await fs.writeFile(nasYmlPath, yaml.dump(contentObj));

  return mergedNasMappings;
}

function updateEnvironmentsInTpl({ tplPath, tpl, envs,
  serviceName,
  functionName,
  displayLog = true
}) {
  const updatedTplContent = _.cloneDeep(tpl);

  const { functionRes } = definition.findFunctionByServiceAndFunctionName(updatedTplContent.Resources, serviceName, functionName);

  const mergedEnvs = mergeEnvs(functionRes, envs);

  if (_.isEmpty(functionRes['Properties'])) {
    functionRes.Properties = {
      'EnvironmentVariables': mergedEnvs
    };
  } else {
    functionRes.Properties.EnvironmentVariables = mergedEnvs;
  }

  util.outputTemplateFile(tplPath, updatedTplContent);

  if (displayLog) {
    console.log(green(`Fun add environment variables to '${serviceName}/${functionName}' in ${tplPath}`));
  }

  return updatedTplContent;
}

function generateBackupTplPath(tplPath) {
  const tplDir = path.dirname(tplPath);
  const tplName = path.basename(tplPath);
  const newTplName = `.${tplName}.backup`;
  return path.join(tplDir, newTplName);
}

function updateNasAutoConfigureInTpl(tplPath, tpl, serviceName) {
  const updatedTplContent = _.cloneDeep(tpl);

  const { serviceRes } = definition.findServiceByServiceName(updatedTplContent.Resources, serviceName);

  if (_.isEmpty(serviceRes['Properties'])) {
    serviceRes.Properties = {
      'NasConfig': 'Auto'
    };
  } else {
    serviceRes.Properties.NasConfig = 'Auto';
  }

  util.outputTemplateFile(tplPath, updatedTplContent);

  console.log(green(`Fun add 'NasConfig: Auto' configuration to ${tplPath}`));

  return updatedTplContent;
}

async function updateNasAutoConfigure(tplPath, tpl, serviceName) {
  const { projectTpl, projectTplPath } = await getTplInfo(tpl, tplPath);

  const updatedTplContent = await updateNasAutoConfigureInTpl(projectTplPath, projectTpl, serviceName);
  return updatedTplContent;
}

function updateNasAndVpcInTpl(tplPath, tpl, serviceName, nasAndVpcConfig) {
  const updatedTplContent = _.cloneDeep(tpl);

  const { serviceRes } = definition.findServiceByServiceName(updatedTplContent.Resources, serviceName);

  if (_.isEmpty(serviceRes['Properties'])) {
    serviceRes.Properties = nasAndVpcConfig;
  } else {
    serviceRes.Properties.VpcConfig = nasAndVpcConfig.VpcConfig;
    serviceRes.Properties.NasConfig = nasAndVpcConfig.NasConfig;
  }

  console.log(green(`Fun add 'NasConfig' and 'VpcConfig' configuration to your template.yml.`));

  util.outputTemplateFile(tplPath, updatedTplContent);
  return updatedTplContent;
}

async function getTplInfo(tpl, tplPath) {
  let projectTpl;
  let projectTplPath;

  if (usingProjectTemplate(tplPath)) {

    projectTpl = tpl;
    projectTplPath = tplPath;
  } else {
    const obj = await getProjectTpl(tplPath);
    projectTpl = obj.projectTpl;
    projectTplPath = obj.projectTplPath;
  }

  return {
    projectTpl,
    projectTplPath
  };
}

async function updateNasAndVpc(tplPath, tpl, serviceName, nasAndVpcConfig) {
  const { projectTpl, projectTplPath } = await getTplInfo(tpl, tplPath);

  const updatedTplContent = updateNasAndVpcInTpl(projectTplPath, projectTpl, serviceName, nasAndVpcConfig);

  return updatedTplContent;
}

async function generateNasMappingsAndEnvs({
  baseDir,
  serviceName,
  functionName,
  runtime,
  codeUri,
  nasConfig
}) {
  const envs = {};

  const nasMappings = {};
  const nasMapping = [];

  const prefix = parseMountDirPrefix(nasConfig);
  // used for log
  const nasMappingPath = path.resolve(baseDir, '.nas.yml');
  const localSystemDependency = path.resolve(codeUri, SYSTEM_DEPENDENCY_PATH);

  if (await fs.pathExists(localSystemDependency)) { // system dependence
    const remoteNasDir = `${prefix}root`;

    nasMapping.push({
      localNasDir: path.relative(baseDir, localSystemDependency),
      remoteNasDir
    });

    nasMappings[serviceName] = nasMapping;

    Object.assign(envs, generateSystemNasEnvs(remoteNasDir));

    outputNasMappingLog(baseDir, nasMappingPath, localSystemDependency);
  }

  const dependencyMappings = runtimeDependencyMappings[runtime];

  for (const mapping of dependencyMappings) {
    const localDir = resolveLocalNasDir(runtime, baseDir, codeUri, mapping.localDir, serviceName, functionName);

    if (await fs.pathExists(localDir)) { // language local dependencies dir exist

      const remoteDir = `${prefix}${mapping.remoteDir}`;

      nasMapping.push({
        localNasDir: localDir,
        remoteNasDir: remoteDir
      });

      const resolveNasDir = mapping.pathSuffix ? remoteDir + '/' + mapping.pathSuffix : remoteDir;
      Object.assign(envs, generateNasEnv(mapping.defaultEnv, resolveNasDir, mapping.env));

      outputNasMappingLog(baseDir, nasMappingPath, localDir);
    }
  }

  nasMappings[serviceName] = nasMapping;

  return {
    envs,
    nasMappings,
    remoteNasDirPrefix: prefix
  };
}

function generateNasEnv(defaultEnvValue, remoteNasDir, envKey) {
  const env = {};

  if (!envKey) {
    return env;
  }

  env[envKey] = defaultEnvValue ? `${remoteNasDir}:${defaultEnvValue}` : remoteNasDir;

  return env;
}

function resolveLocalNasDir(runtime, baseDir, codeUri, localDirInNasMappings, serviceName, functionName) {
  let localDir;
  if (runtime === 'java8') {
    localDir = path.relative(baseDir, path.join(localDirInNasMappings, serviceName, functionName, 'lib'));
  } else {
    localDir = path.relative(baseDir, path.join(codeUri, localDirInNasMappings));
  }
  return localDir;
}

function parseMountDirPrefix(nasConfig) {
  if (definition.isNasAutoConfig(nasConfig)) {
    return '/mnt/auto/';
  }
  const mountPoints = nasConfig.MountPoints;
  ensureOnlyOneMountPoinExists(mountPoints);

  const mountPoint = _.head(mountPoints).MountDir;
  if (_.endsWith(mountPoint, '/')) {
    return mountPoint;
  }
  return mountPoint + '/';
}

// Fun add .fun/build/artifacts/nas-example3/oversize-java-example/lib to /Users/ellison/fun/examples/ellison/oversize-java/.nas.yml
function outputNasMappingLog(baseDir, nasMappingPath, localNasDir) {
  console.log(green(`Fun add ${path.relative(baseDir, localNasDir)} to ${nasMappingPath}`));
}

function generateSystemNasEnvs(rootEnvPrefix) {
  return {
    'LD_LIBRARY_PATH': `${generateDefaultLibPath(rootEnvPrefix)}`
  };
}

async function nasCpFromlocalNasDirToRemoteNasDir(tpl, tplPath, baseDir, nasServiceName, nasMappings) {
  const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'cp');

  for (const { localNasDir, remoteNasDir } of nasMappings) {
    const srcPath = path.resolve(baseDir, localNasDir);
    const dstPath = `nas://${nasServiceName}${remoteNasDir}/`;

    console.log(yellow(`\nstarting upload ${srcPath} to ${dstPath}`));

    await nasCp(srcPath, dstPath, true, false, localNasTmpDir, tpl, tplPath, baseDir, false, true);
  }
}

async function processOtherFunctionsUnderServiceIfNecessary({
  baseDir, codeUri, runtime, envs, tpl, tplPath,
  originServiceName, originFunctionName
}) {

  let tplChanged = false;

  const otherFunctions = definition.findFunctionsInTpl(tpl, (functionName, functionRes) => {
    return originFunctionName !== functionName;
  });

  if (_.isEmpty(otherFunctions)) { return { updatedEnvsTpl: tpl, tplChanged }; }

  const pendingFuntions = otherFunctions.filter(m => {
    const functionProp = m.functionRes.Properties;

    const otherCodeUri = (functionProp || {}).CodeUri;
    const otherAbsCodeUri = path.resolve(baseDir, otherCodeUri);
    const otherRuntime = (functionProp || {}).Runtime;

    return (_.isEqual(runtimeDependencyMappings[runtime], runtimeDependencyMappings[otherRuntime]) && codeUri === otherAbsCodeUri);
  });

  if (_.isEmpty(pendingFuntions)) { return { updatedEnvsTpl: tpl, tplChanged }; }

  for (const pendingFuntion of pendingFuntions) {

    tpl = updateEnvironmentsInTpl({
      tplPath, tpl, envs,
      serviceName: originServiceName,
      functionName: pendingFuntion.functionName
    });
  }

  return {
    updatedEnvsTpl: tpl,
    tplChanged: true
  };
}

async function processNasMappingsAndEnvs({ tpl, tplPath, runtime, codeUri, baseDir,
  serviceName,
  functionName,
  convertedNasConfig
}) {

  const { serviceRes } = definition.findFunctionByServiceAndFunctionName(tpl.Resources, serviceName, functionName);

  const { envs, nasMappings, remoteNasDirPrefix } = await generateNasMappingsAndEnvs({
    baseDir, runtime, codeUri,
    serviceName: serviceName,
    functionName: functionName,
    nasConfig: convertedNasConfig || (serviceRes.Properties || {}).NasConfig
  });

  const appendContet = `  <dir>${remoteNasDirPrefix}${FONTS_MAPPING.remoteDir}</dir>`;
  await generateFontsConfAndEnv(baseDir, codeUri, appendContet);

  const localDirs = _.map(runtimeDependencyMappings[runtime], mapping => path.join(codeUri, mapping.localDir));

  if (_.isEmpty(nasMappings[serviceName])) {
    throw new Error(red(`\nFun detects that your dependencies are not included in path ${localDirs} or ${path.resolve(codeUri, SYSTEM_DEPENDENCY_PATH)}`));
  }

  const nasMappingsObj = await saveNasMappings(getNasYmlPath(tplPath), nasMappings);

  const { updatedEnvsTpl, tplChanged } = await processEnvironments({ baseDir, codeUri, tplPath, tpl, envs, runtime, serviceName, functionName });

  return {
    tplChanged,
    remoteNasDirPrefix,
    updatedTpl: updatedEnvsTpl,
    serviceNasMappings: nasMappingsObj
  };
}

async function isSpringBootJar(jarfilePath) {
  try {
    const data = await zip.readZipFile(jarfilePath, 'META-INF/MANIFEST.MF');
    const content = data.toString();

    return _.includes(content, 'Spring-Boot-Version');
  } catch (e) {
    return false;
  }
}

// 1. unzip spring boot jar to a tmp dir
// 2. copy BOOT-INF/lib from tmp dir to nas folder
// 3. zip tmp dir again and replace origin spring boot jar
async function repackSpringBootJar(unzippedPath, absJarfilePath, targetAbsPath) {
  const libTmpAbsPath = path.join(unzippedPath, 'BOOT-INF', 'lib');
  const targetLibAbsPath = path.join(targetAbsPath, 'lib');

  await fs.ensureDir(targetLibAbsPath);
  debug('copy lib from ', libTmpAbsPath, 'to', targetLibAbsPath);

  await fs.copy(libTmpAbsPath, targetLibAbsPath, {
    overwrite: true,
    recursive: false
  });
  await fs.remove(libTmpAbsPath);
  await fs.ensureDir(libTmpAbsPath);
  await zip.packTo(unzippedPath, null, absJarfilePath);
  await fs.remove(libTmpAbsPath);
}

async function detectJarfilePathFromBootstrap(bootstrapContent) {
  const matched = bootstrapContent.match(BOOTSTRAP_SPRING_BOOT_JAR_REGEX);
  let repackaged = false;
  let jarfilePath;

  if (matched) {
    jarfilePath = matched[3];
  } else {
    if (_.includes(bootstrapContent, 'org.springframework.boot.loader.PropertiesLauncher')) {
      repackaged = true;

      // export CLASSPATH = "$CLASSPATH:./target/java-getting-started-1.0.jar"
      const regex = new RegExp('[0-9a-zA-Z./_-]+\\.jar', 'm');
      const matchedJar = bootstrapContent.match(regex);
      if (matchedJar) {
        jarfilePath = matchedJar[0];
      } else {
        throw new Error('not supported your java project'); 
      }
    }

    debug('could not find your jar file');
  }

  return { jarfilePath, repackaged };
}

async function generateRepackagedBootstrap(bootstrapPath, bootstrapContent) {
  const replacedContent = bootstrapContent.replace(BOOTSTRAP_SPRING_BOOT_JAR_REGEX, (match, p1, p2, p3) => {
    return `export CLASSPATH="$CLASSPATH:./${p3}"
${p1}${p2} org.springframework.boot.loader.PropertiesLauncher`;
  });

  await fs.copy(bootstrapPath, bootstrapPath + '.bak');
  await fs.writeFile(bootstrapPath, replacedContent);
}

async function processCustomRuntimeSpringBootIfNecessary({ tpl, runtime, codeUri, baseDir }) {
  if (runtime !== 'custom') { return tpl; }

  debug('java project oversized, try to repack spring boot jar');

  const absCodeUri = path.resolve(baseDir, codeUri);
  const bootstrapPath = path.join(absCodeUri, 'bootstrap');
  if (!await fs.pathExists(bootstrapPath)) {
    throw new Error('could not found bootstrap file');
  }

  const bootstrapContent = await fs.readFile(bootstrapPath, 'utf8');

  // 1. nas 的 CLASSPATH 依赖会在 yml 中声明
  // 2. bootstrap 中声明 spring boot 的 jar 的依赖
  // 3. 修改 bootstrap 内容
  //   3.1 添加 export CLASSPATH="$CLASSPATH:./target/java-getting-started-1.0.jar"
  //   3.2 将 java -jar -Dserver.port=$PORT target/java-getting-started-1.0.jar 修改为 java org.springframework.boot.loader.PropertiesLauncher
  const { jarfilePath, repackaged } = await detectJarfilePathFromBootstrap(bootstrapContent);

  if (!jarfilePath) { return tpl; }

  const absJarfilePath = path.join(absCodeUri, jarfilePath);

  if (!await fs.pathExists(absJarfilePath)) {
    throw new Error('jarfile not exist ' + absJarfilePath);
  }

  if (!await isSpringBootJar(absJarfilePath)) {
    throw new Error('jarfile ' + absJarfilePath + 'is not a spring boot jar');
  }

  const tmpCodeDir = path.join(tmpDir, uuid.v4());
  await fs.ensureDir(tmpCodeDir);
  await zip.extractZipTo(absJarfilePath, tmpCodeDir);

  // todo: 先支持 fun deploy 自动生成的场景，也就是 jar 在 target 下面
  // codeUri 可能是一个 target/xxx.jar，也可能是 ./
  // 在这个场景，codeUri 不能是 target/xxx.jar，因为还要有 bootstrap
  const idx = absJarfilePath.indexOf('target/');

  if (idx < 0) {
    throw new Error('could not found target directory');
  }

  // repackage spring boot jar
  const targetAbsPath = absJarfilePath.substring(0, idx + 'target/'.length);

  if (await fs.pathExists(targetAbsPath)) {
    console.log('repackage spring boot jarfile ', absJarfilePath);
    await repackSpringBootJar(tmpCodeDir, absJarfilePath, targetAbsPath);
  } else {
    throw new Error('target path not exist ' + targetAbsPath);
  }

  if (!repackaged) {
    await generateRepackagedBootstrap(bootstrapPath, bootstrapContent);
  }

  return tpl;
}

async function processNasAutoConfiguration({ tpl, tplPath, runtime, codeUri, convertedNasConfig, stage,
  serviceName,
  functionName
}) {

  const baseDir = getBaseDir(tplPath);

  const updatedTplContent = await processCustomRuntimeSpringBootIfNecessary({
    runtime, baseDir,
    codeUri,
    tpl
  });

  const rs = await processNasMappingsAndEnvs({
    tpl: updatedTplContent,
    tplPath, runtime, codeUri, baseDir,
    serviceName,
    functionName,
    convertedNasConfig
  });

  if (stage === 'package') { return rs.tplChanged; }

  const serviceNasMappings = await processPythonModelIfNecessary({
    codeUri, runtime, baseDir,
    serviceName: serviceName,
    nasYmlPath: getNasYmlPath(tplPath),
    remoteNasDirPrefix: rs.remoteNasDirPrefix,
    serviceNasMappings: rs.serviceNasMappings
  });

  // fun nas cp
  await nasCpFromlocalNasDirToRemoteNasDir(tpl, tplPath, baseDir, serviceName, serviceNasMappings[serviceName]);

  console.log(yellow(`\nFun has automatically uploaded your code dependency to NAS, then fun will use 'fun deploy ${serviceName}/${functionName}' to redeploy.`));

  console.log(`Waiting for service ${serviceName} to be deployed...`);
  const partialDeploy = await require('./deploy/deploy-by-tpl').partialDeployment(`${serviceName}/${functionName}`, updatedTplContent);

  if (partialDeploy.resourceName) {
    // can not use baseDir, should use tpl dirname
    await require('./deploy/deploy-by-tpl').deployService({
      baseDir: path.dirname(tplPath),
      serviceName: partialDeploy.resourceName,
      serviceRes: partialDeploy.resourceRes,
      onlyConfig: false, tplPath, skipTrigger: true, useNas: false
    });
  }

  return rs.tplChanged;
}

async function updateEnvironments({
  tplPath, tpl, envs, baseDir, codeUri, runtime,
  serviceName, functionName
}) {

  const updatedTplContent = updateEnvironmentsInTpl({ envs, tpl, tplPath, serviceName, functionName });

  return await processOtherFunctionsUnderServiceIfNecessary({
    tpl: updatedTplContent, tplPath,
    baseDir, codeUri, runtime, envs,
    originServiceName: serviceName,
    originFunctionName: functionName
  });
}

async function processEnvironments({
  tplPath, tpl, envs, baseDir, codeUri, runtime,
  serviceName, functionName
}) {

  const rs = await updateEnvironments({
    tplPath, tpl, envs, baseDir, codeUri, runtime,
    serviceName, functionName
  });

  if (usingProjectTemplate(tplPath)) {
    return rs;
  }

  const { projectTpl, projectTplPath } = await getTplInfo(tpl, tplPath);

  const result = await updateEnvironments({
    tplPath: projectTplPath, tpl: projectTpl, envs, baseDir, codeUri, runtime,
    serviceName, functionName
  });

  const rootTplPath = getRootTplPath(tplPath);

  await updateTimestamps(tplPath, [rootTplPath, path.dirname(rootTplPath)]);

  return result;
}

async function processPythonModelIfNecessary({ nasYmlPath, codeUri, runtime, baseDir,
  serviceName,
  remoteNasDirPrefix,
  serviceNasMappings
}) {

  if (!_.includes(['python2.7', 'python3'], runtime)) { return serviceNasMappings; }

  const absModelPath = path.resolve(codeUri, 'model');

  if (!await fs.pathExists(absModelPath)) { return serviceNasMappings; }

  const nasMappings = await extractNasMappingsFromNasYml(baseDir, serviceName);

  const modelMapping = nasMappings.find(arr => {
    return path.resolve(baseDir, arr.localNasDir) === absModelPath;
  });

  if (!_.isEmpty(modelMapping)) { return serviceNasMappings; }

  const remoteNasDir = `${remoteNasDirPrefix}model`;

  console.log(`
Fun has detected that there is a model folder. It is recommend to synchronize your model folder to NAS.
You can add the following configuration to ` + yellow(`'nasMapping.${serviceName}'`) + ` in ` + yellow(`${nasYmlPath}
`)

+ yellow(`
  - localNasDir: ${absModelPath}
    remoteNasDir: ${remoteNasDir}
    `)
+ `
After adding, fun is going to automatically synchronize the ` + yellow(`local`) + ` directory ${absModelPath} to ` + yellow(`remote`) + ` ${remoteNasDir}.
If these files ` + yellow('under') + ` model directory are used on your function code, you need to ${remoteNasDir} update these files path manully.
`);

  await promptForInputContinue('Please input enter to continue.');

  return await getNasMappingsFromNasYml(nasYmlPath);
}

async function backupTemplateFile(tplPath) {
  const baseDir = getBaseDir(tplPath);
  const originTplPath = path.resolve(baseDir, path.basename(tplPath));
  const newPath = generateBackupTplPath(originTplPath);
  await fs.copy(originTplPath, newPath);
  console.log(green(`\nFun automatically backups the original ${path.basename(tplPath)} file to ${newPath}`));
}

function ensureMountTargetsExist(mountTargets) {
  if (_.isEmpty(mountTargets)) {
    throw new Error(red('Nas has not configured the mountTarget yet, please go to the console https://nas.console.aliyun.com/ to manually create the mountTarget.'));
  }
}

function ensureSecurityGroupsExist(securityGroups) {
  if (_.isEmpty(securityGroups)) {
    throw new Error(red(`\nThere is no SecurityGroup available. You need to login to the vpc console https://ecs.console.aliyun.com/ to create one and then use 'fun deploy' to deploy your resources again.`));
  }
}

function ensureNasFileSystemsExist(nasFileSystems) {
  if (_.isEmpty(nasFileSystems)) {
    throw new Error(red(`\nThere is no NAS file system available. You need to login to the nas console http://nas.console.aliyun.com to create one and then use 'fun deploy' to deploy your resources again.`));
  }
}

function ensureOnlyOneMountPoinExists(mountPoints) {
  if (mountPoints.length > 1) {
    throw new Error(red(`More than one 'NasConfig' configuration in template.yml.`));
  }
}

async function getSecurityGroups(vpcId) {
  const ecsClient = await getEcsPopClient();
  const profile = await getProfile();
  return await securityGroup.describeSecurityGroups(ecsClient, profile.defaultRegion, vpcId, undefined);
}

async function processNasSelection() {
  const nasClient = await getNasPopClient();
  const nasFileSystems = await nas.getAvailableNasFileSystems(nasClient);
  ensureNasFileSystemsExist(nasFileSystems);

  const nasAnswer = await promptForFileSystems(nasFileSystems);
  const nasSelected = nasFileSystems.filter(f => f.fileSystemId === nasAnswer.fileSystemId);
  const mountTargets = _.head(nasSelected).mountTargets;
  ensureMountTargetsExist(mountTargets);

  const mountTargetAnswer = await promptForMountTargets(mountTargets);
  const mountTargetSelected = mountTargets.filter(f => f.MountTargetDomain === mountTargetAnswer.mountTargetDomain);
  const mountTarget = _.head(mountTargetSelected);

  const securityGroups = await getSecurityGroups(mountTarget.VpcId);
  ensureSecurityGroupsExist(securityGroups);

  const securityGroupAnswer = await promptForSecurityGroup(securityGroups);
  const securityGroupId = securityGroupAnswer.securityGroupId;

  return {
    mountTarget,
    securityGroupId
  };
}

function replaceNasConfig(nasConfig, mountDir) {
  const cloneNasConfig = _.cloneDeep(nasConfig);
  cloneNasConfig.MountPoints = cloneNasConfig.MountPoints.filter(f => f.MountDir === mountDir);
  return cloneNasConfig;
}

async function ensureCodeUriForJava(codeUri, serviceName, functionName) {

  if (codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war')) {
    throw new Error(`
You can follow these steps:
    1. Modify ${serviceName}/${functionName}'s 'CodeUri' property to the directory where 'pom.xml' is located.
    2. Execute 'fun build' to build your functions.
    3. Execute 'fun deploy' to deploy resources.`);
  }
}

async function nasAutoConfigurationIfNecessary({ stage, tplPath, runtime, codeUri, nasConfig, vpcConfig, useNas = false,
  compressedSize = 0,
  nasFunctionName,
  nasServiceName
}) {

  let stop = false;
  let tplChanged = false;

  if (!_.includes(SUPPORT_RUNTIMES, runtime) || (!useNas && compressedSize < 52428800)) { return { stop, tplChanged }; }

  if (compressedSize > 52428800) {
    console.log(red(`\nFun detected that your function ${nasServiceName}/${nasFunctionName} sizes exceed 50M. It is recommended that using the nas service to manage your function dependencies.`));
  }

  await ensureCodeUriForJava(codeUri, nasServiceName, nasFunctionName);

  if (await promptForConfirmContinue(`Do you want to let fun to help you automate the configuration?`)) {

    const packageStage = (stage === 'package');
    const tpl = await getTpl(tplPath);

    if (definition.isNasAutoConfig(nasConfig)) {
      const yes = await promptForConfirmContinue(`You have already configured 'NasConfig: Auto’. We want to use this configuration to store your function dependencies.`);
      if (yes) {

        if (packageStage && !_.isEmpty(vpcConfig)) {
          throw new Error(`When 'NasConfig: Auto' is specified, 'VpcConfig' is not supported.`);
        }
        await backupTemplateFile(tplPath); // backup tpl

        tplChanged = await processNasAutoConfiguration({ tpl, tplPath, runtime, codeUri, stage,
          serviceName: nasServiceName,
          functionName: nasFunctionName
        });

        stop = true;
      } else {
        throw new Error(red(`\nIf 'NasConfig: Auto' is configured, only the configuration store function dependency is currently supported.`));
      }
    } else if (!_.isEmpty(vpcConfig) && _.isEmpty(nasConfig)) {

      throw new Error(red(`\nFun has detected that you only have VPC configuration. This scenario is not supported at this time. You also need to manually configure the NAS service. You can refer to: https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#nas-%E9%85%8D%E7%BD%AE%E5%AF%B9%E8%B1%A1 and https://nas.console.aliyun.com/`));
    } else if (!_.isEmpty(vpcConfig) && !_.isEmpty(nasConfig)) {

      if (packageStage) {
        throw new Error(`When 'NasConfig' is specified, 'VpcConfig' is not supported.`);
      }
      if (definition.onlyOneNASExists(nasConfig)) {
        const yes = await promptForConfirmContinue(`We have detected that you already have a NAS configuration. Do you directly use this NAS storage function dependencies.`);
        if (yes) {
          await backupTemplateFile(tplPath);

          tplChanged = await processNasAutoConfiguration({ tpl, tplPath, runtime, codeUri, stage,
            serviceName: nasServiceName,
            functionName: nasFunctionName
          });
        } else {
          throw new Error(red(`If your yml has been already configured with 'NasConfig', fun only supports to use this 'NasConfig' to process your function dependencies. Otherwise you need to handle the dependencies by yourself.\n\nRefer to https://yq.aliyun.com/articles/712700 for more help.`));
        }
      } else {
        const answer = await promptForMountPoints(nasConfig.MountPoints);
        const convertedNasConfig = replaceNasConfig(nasConfig, answer.mountDir);
        await backupTemplateFile(tplPath);

        tplChanged = await processNasAutoConfiguration({ tpl, tplPath, runtime, codeUri, stage,
          convertedNasConfig,
          serviceName: nasServiceName,
          functionName: nasFunctionName
        });
      }

      stop = true;
    } else if (_.isEmpty(vpcConfig) && _.isEmpty(nasConfig)) {
      const yes = await promptForConfirmContinue(`We recommend using the 'NasConfig: Auto' configuration to manage your function dependencies.`);
      if (yes) {
        await backupTemplateFile(tplPath);
        // write back to yml
        const updatedTpl = await updateNasAutoConfigure(tplPath, tpl, nasServiceName);

        tplChanged = await processNasAutoConfiguration({ tpl: updatedTpl, tplPath, runtime, codeUri, stage,
          serviceName: nasServiceName,
          functionName: nasFunctionName
        });
      } else {
        // list available NAS
        const { mountTarget, securityGroupId } = await processNasSelection();

        await backupTemplateFile(tplPath); // backup tpl

        const nasAndVpcConfig = generateNasAndVpcConfig(mountTarget, securityGroupId, nasServiceName);
        const updatedTpl = await updateNasAndVpc(tplPath, tpl, nasServiceName, nasAndVpcConfig);

        tplChanged = await processNasAutoConfiguration({ tpl: updatedTpl, tplPath, runtime, codeUri, stage,
          serviceName: nasServiceName,
          functionName: nasFunctionName
        });
      }
      stop = true;
    }
  }

  return {
    stop,
    tplChanged
  };
}

function usingProjectTemplate(tplPath) {
  const baseDir = getBaseDir(tplPath);
  return path.dirname(tplPath) === path.resolve(baseDir);
}

function generateNasAndVpcConfig(mountTarget, securityGroupId, serviceName) {
  const nasConfig = {
    'UserId': 10003,
    'GroupId': 10003,
    'MountPoints': [
      {
        'ServerAddr': `${mountTarget.MountTargetDomain}:/${serviceName}`,
        'MountDir': '/mnt/nas'
      }
    ]
  };

  const vpcConfig = {
    'VpcId': mountTarget.VpcId,
    'VSwitchIds': [mountTarget.VswId],
    'SecurityGroupId': securityGroupId
  };

  return {
    'VpcConfig': vpcConfig,
    'NasConfig': nasConfig
  };
}

function writeFileToLine(filePath, content, lineNum) {
  let data = fs.readFileSync(filePath, 'utf8').split(/\r?\n/gm);
  data.splice(lineNum, 0, content);
  fs.writeFileSync(filePath, data.join('\n'), {
    encoding: 'utf8'
  });
}

const DEFAULT_FONTS_CONFIG_ENV = {
  'FONTCONFIG_FILE': '/code/.fonts.conf'
};

async function generateFontsConfAndEnv(baseDir, codeUri, appendContet) {

  const absCodeUri = path.resolve(baseDir, codeUri);
  const fontsDir = path.join(absCodeUri, 'fonts');

  if (!await fs.pathExists(fontsDir) || !await isNotEmptyDir(fontsDir)) { return {}; }

  const fontsConfPath = path.join(absCodeUri, '.fonts.conf');

  if (!await fs.pathExists(fontsConfPath)) {
    const sourcePath = path.resolve(__dirname, './utils/fonts/fonts.conf');
    await fs.copyFile(sourcePath, fontsConfPath);
  }

  if (appendContet) {
    writeFileToLine(fontsConfPath, appendContet, 29);
  }

  return DEFAULT_FONTS_CONFIG_ENV;
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
  instanceConcurrency,
  nasConfig,
  vpcConfig
}, onlyConfig, tplPath, useNas = false) {
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

      const fontsConfEnv = await generateFontsConfAndEnv(baseDir, codeUri);
      if (!_.isEmpty(fontsConfEnv)) {

        updateEnvironmentsInTpl({ serviceName, functionName, tplPath,
          displayLog: false,
          tpl: await getTpl(tplPath),
          envs: DEFAULT_FONTS_CONFIG_ENV
        });
      }

      console.log(`\t\tWaiting for packaging function ${functionName} code...`);
      const { base64, count, compressedSize } = await zipCode(baseDir, codeUri, runtime, functionName);

      const rs = await nasAutoConfigurationIfNecessary({
        nasFunctionName: functionName,
        nasServiceName: serviceName,
        codeUri: path.resolve(baseDir, codeUri),
        compressedSize, tplPath, runtime, nasConfig, vpcConfig, useNas
      });

      if (rs.stop) { return { tplChanged: rs.tplChanged }; }

      const convertedSize = bytes(compressedSize, {
        unitSeparator: ' '
      });

      if (!count || !compressedSize) {
        console.log(green(`\t\tThe function ${functionName} has been packaged.`));
      } else {
        console.log(green(`\t\tThe function ${functionName} has been packaged. A total of ` + yellow(`${count}`) + `${count === 1 ? ' file' : ' files'}` + ` were compressed and the final size was` + yellow(` ${convertedSize}`)));
      }

      code = {
        zipFile: base64
      };
    }
  }

  const confEnv = await resolveLibPathsFromLdConf(baseDir, codeUri);

  Object.assign(environmentVariables, confEnv);

  const params = {
    description, handler, initializer, code,
    timeout, initializationTimeout, memorySize, runtime, instanceConcurrency,
    environmentVariables: addEnv(castEnvironmentVariables(environmentVariables), nasConfig)
  };

  try {
    if (!fn) {
      // create
      params['functionName'] = functionName;
      await fc.createFunction(serviceName, params);
    } else {
      // update
      await fc.updateFunction(serviceName, functionName, params);
    }
  } catch (ex) {
    if (ex.message.indexOf('timeout') !== -1) {
      throw new Error(`\nError message: ${ex.message}.\n\n` + red(`This error may be caused by network latency. You can set the client timeout to a larger value through 'fun config' and try again.`));
    }
    throw ex;
  }
  return {
    tplChanged: false
  };
}

function castEnvironmentVariables(environments) {
  const envs = Object.assign({}, environments);

  for (let key in envs) {
    if (envs.hasOwnProperty(key)) {

      if (_.isObject(envs[key]) || _.isNull(envs[key])) {
        throw new Error(`InvalidError: the value of '${key}' in EnvironmentVariables must be a string.`);
      }

      if (!isNaN(envs[key])) {
        console.log(`the value in environmentVariables:${envs[key]} cast String Done`);
        envs[key] = envs[key] + '';
      }
    }
  }

  return envs;
}

function generateSlsProjectName(accountId, region) {
  const uuidHash = getUuid(accountId);
  return `aliyun-fc-${region}-${uuidHash}`;
}

async function generateDefaultLogConfig() {
  const profile = await getProfile();
  return {
    Project: generateSlsProjectName(profile.accountId, profile.defaultRegion),
    Logstore: `function-log`
  };
}

async function transformLogConfig(logConfig) {
  if (logConfig === 'Auto') {
    const defaultLogConfig = await generateDefaultLogConfig();

    console.log(yellow(`\tusing 'LogConfig: Auto'. Fun will generate default sls project.`));
    console.log(`\tproject: ${defaultLogConfig.project}, logstore: ${defaultLogConfig.logstore}\n`);

    const description = 'create default log project by fun';
    await makeSlsAuto(defaultLogConfig.project, description, defaultLogConfig.logstore);

    return defaultLogConfig;
  }

  return {
    project: logConfig.Project || '',
    logstore: logConfig.Logstore || ''
  };
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

  let service;
  await promiseRetry(async (retry, times) => {
    try {
      service = await fc.getService(serviceName);
    } catch (ex) {
      if (ex.code === 'AccessDenied' || !ex.code || ex.code === 'ENOTFOUND') {
        if (ex.message.indexOf('FC service is not enabled for current user') !== -1) {
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

  const resolvedLogConfig = await transformLogConfig(logConfig);

  const options = {
    description,
    role,
    logConfig: resolvedLogConfig
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
    const vpcId = vpcConfig.vpcId || vpcConfig.VpcId;
    const vswitchIds = vpcConfig.vswitchIds || vpcConfig.VSwitchIds;

    console.log('\tusing \'NasConfig: Auto\', Fun will try to generate related nas file system automatically');
    nasConfig = await nas.generateAutoNasConfig(serviceName, vpcId, vswitchIds, nasConfig.UserId, nasConfig.GroupId);
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
      if (ex.code === 'AccessDenied') {
        throw ex;
      }
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

const EXTREME_PATH_PREFIX = '/share';

function checkMountPointDomainIsExtremeNas(mountPointDomain, remoteDir) {
  const isExtremeNAS = mountPointDomain.indexOf('.extreme.nas.aliyuncs.com') !== -1;

  if (isExtremeNAS && (remoteDir !== EXTREME_PATH_PREFIX && !remoteDir.startsWith(EXTREME_PATH_PREFIX + '/'))) {
    throw new Error('Extreme nas mount point must start with /share. Please refer to https://nas.console.aliyun.com/#/extreme for more help.');
  }

  return isExtremeNAS;
}

async function ensureNasDirExist({
  role,
  vpcConfig,
  nasConfig
}) {
  const mountPoints = nasConfig.MountPoints;
  const modifiedNasConfig = _.cloneDeep(nasConfig);

  modifiedNasConfig.MountPoints = mapMountPointDir(mountPoints, (mountPointDomain, remoteDir, mountDir) => {

    if (checkMountPointDomainIsExtremeNas(mountPointDomain, remoteDir)) {
      // 极速 nas
      return {
        ServerAddr: `${mountPointDomain}:${EXTREME_PATH_PREFIX}`,
        MountDir: `${mountDir}`
      };
    } else if (remoteDir !== '/') {
      return {
        ServerAddr: `${mountPointDomain}:/`,
        MountDir: `${mountDir}`
      };
    } return null;
  });

  const nasMountDirs = mapMountPointDir(mountPoints, (mountPointDomain, remoteDir, mountDir) => {
    if (checkMountPointDomainIsExtremeNas(mountPointDomain, remoteDir)) {
      if (remoteDir !== EXTREME_PATH_PREFIX) {
        return { mountDir, remoteDir, isExtreme: true };
      }
    } else if (remoteDir !== '/') {
      return { mountDir, remoteDir, isExtreme: false };
    }
    return null;
  });

  debug('dirs need to check: %s', nasMountDirs);

  if (!_.isEmpty(nasMountDirs)) {
    let nasRemoteDirs = [];
    let nasDirsNeedToCheck = [];
    for (let nasMountDir of nasMountDirs) {
      nasRemoteDirs.push(nasMountDir.remoteDir);
      if (nasMountDir.isExtreme) {
        // 002aab55-fbdt.cn-hangzhou.extreme.nas.aliyuncs.com:/share
        nasDirsNeedToCheck.push(path.posix.join(nasMountDir.mountDir, nasMountDir.remoteDir.substring(EXTREME_PATH_PREFIX.length)));
      } else {
        nasDirsNeedToCheck.push(path.posix.join(nasMountDir.mountDir, nasMountDir.remoteDir));
      }
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

async function makeFcUtilsFunctionTmpDomainToken(token, role) {

  const tmpServiceName = 'fc-domain-challenge';

  await makeService({
    serviceName: tmpServiceName,
    role,
    description: 'generated by Funcraft for authentication',
    vpcConfig: {},
    nasConfig: {}
  });

  const functionCode = await getFcUtilsFunctionCode('tmp-domain-token.js');

  const tmpFunctionName = `fc-${token}`;

  const codes = {
    'index.js': functionCode
  };

  await makeFcUtilsFunction({
    serviceName: tmpServiceName,
    functionName: tmpFunctionName,
    codes,
    description: 'used for tmp domain service to authenticate.',
    handler: 'index.handler'
  });

  const tmpTriggerName = 'tmp-domain-http';

  const triggerProperties = {
    'AuthType': 'ANONYMOUS',
    'Methods': [
      'GET',
      'POST',
      'PUT'
    ]
  };

  await makeTrigger({
    serviceName: tmpServiceName,
    functionName: tmpFunctionName,
    triggerName: tmpTriggerName,
    triggerType: 'HTTP',
    triggerProperties
  });

  return {
    tmpServiceName,
    tmpFunctionName,
    tmpTriggerName
  };
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

async function deleteFunction(serviceName, functionName, triggerName) {
  const fc = await getFcClient();

  if (triggerName) {
    await fc.deleteTrigger(serviceName, functionName, triggerName);
  }

  await fc.deleteFunction(serviceName, functionName);
}

module.exports = {
  zipCode, makeService, makeFunction, invokeFunction,
  detectLibrary, generateFunIngore, parseMountDirPrefix,
  FUN_GENERATED_SERVICE, invokeFcUtilsFunction, getFcUtilsFunctionCode, deleteFunction,
  processNasMappingsAndEnvs, processNasAutoConfiguration, nasAutoConfigurationIfNecessary,
  makeFcUtilsFunctionNasDirChecker, generateDefaultLogConfig, makeFcUtilsFunctionTmpDomainToken
};