'use strict';

const fc = require('../fc');
const fnf = require('../fnf');
const fs = require('fs-extra');
const path = require('path');
const util = require('./util');
const zip = require('../package/zip');
const definition = require('../definition');
const bytes = require('bytes');

const { getTpl } = require('../tpl');
const { green, yellow } = require('colors');
const { generateRandomZipPath } = require('../utils/path');
const { generateNasPythonPaths, mergeEnvs } = require('../../lib/install/env');

const _ = require('lodash');

function generateRosTemplateForNasConfig(serviceName, userId, groupId) {
  return {
    'UserId': userId,
    'GroupId': groupId,
    'MountPoints': [
      {
        'ServerAddr': {
          'Fn::Join': [
            '',
            [
              {
                'Ref': 'MountTarget'
              },
              ':/',
              serviceName
            ]
          ]
        },
        'MountDir': '/mnt/auto'
      }
    ]
  };
}

function generateRosTemplateForVpcConfig() {
  return {
    'VpcId': {
      'Ref': 'Vpc'
    },
    'VSwitchIds': [
      {
        'Ref': 'VSwitch'
      }
    ],
    'SecurityGroupId': {
      'Ref': 'SecurityGroup'
    }
  };
}

function generateRosTemplateForDefaultResources(serviceNames, hasNasCpRes) {

  const dependsOnRoles = [...serviceNames.map(serviceName => `AliyunECSNetworkInterfaceManagementAccess${serviceName}Role`)];

  if (hasNasCpRes) {
    dependsOnRoles.push('AliyunECSNetworkInterfaceManagementAccessNasRole');
  }

  return {
    'Vpc': {
      'Type': 'ALIYUN::ECS::VPC',
      'Properties': {
        'Description': 'used for FC Application Repository',
        'CidrBlock': '10.0.0.0/8',
        'VpcName': {
          'Ref': 'ALIYUN::StackName'
        }
      }
    },
    'SecurityGroup': {
      'Type': 'ALIYUN::ECS::SecurityGroup',
      'DependsOn': dependsOnRoles,
      'Properties': {
        'SecurityGroupName': {
          'Ref': 'ALIYUN::StackName'
        },
        'VpcId': {
          'Ref': 'Vpc'
        }
      }
    },
    'VSwitch': {
      'Type': 'ALIYUN::ECS::VSwitch',
      'Properties': {
        'ZoneId': {
          'Fn::FindInMap': [
            'RegionMap',
            {
              'Ref': 'ALIYUN::Region'
            },
            'ZoneId'
          ]
        },
        'VpcId': {
          'Ref': 'Vpc'
        },
        'CidrBlock': '10.20.0.0/16'
      }
    },
    'FileSystem': {
      'Type': 'ALIYUN::NAS::FileSystem',
      'Properties': {
        'StorageType': 'Performance',
        'Description': 'used_for_fun',
        'ProtocolType': 'NFS'
      }
    },
    'MountTarget': {
      'Type': 'ALIYUN::NAS::MountTarget',
      'Properties': {
        'Status': 'Active',
        'VpcId': {
          'Ref': 'Vpc'
        },
        'NetworkType': 'Vpc',
        'VSwitchId': {
          'Ref': 'VSwitch'
        },
        'AccessGroupName': 'DEFAULT_VPC_GROUP_NAME',
        'FileSystemId': {
          'Ref': 'FileSystem'
        }
      }
    }
  };
}

function generateRosTemplateForWaitCondition(count) {
  return {
    'WaitCondition': {
      'Type': 'ALIYUN::ROS::WaitCondition',
      'Properties': {
        'Count': count,
        'Handle': {
          'Ref': 'WaitConHandle'
        },
        'Timeout': 600
      },
      'DependsOn': 'Nas'
    },
    'WaitConHandle': {
      'Type': 'ALIYUN::ROS::WaitConditionHandle',
      'Properties': {
        'Mode': 'Full',
        'Count': -1
      }
    }
  };
}

function generateRosTemplateForNasService(ossCodeUri) {
  return {
    'Nas': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'download dependences from oss and upload to nas.',
        'Policies': [
          'AliyunOssFullAccess'
        ],
        'VpcConfig': {
          'VpcId': {
            'Ref': 'Vpc'
          },
          'VSwitchIds': [
            {
              'Ref': 'VSwitch'
            }
          ],
          'SecurityGroupId': {
            'Ref': 'SecurityGroup'
          }
        },
        'NasConfig': {
          'UserId': 10003,
          'GroupId': 10003,
          'MountPoints': [
            {
              'ServerAddr': {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Ref': 'MountTarget'
                    },
                    ':/'
                  ]
                ]
              },
              'MountDir': '/mnt/nas_dependencies'
            }
          ]
        }
      },
      'NasCpFunc': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.cpFromOssToNasHandler',
          'Runtime': 'nodejs8',
          'CodeUri': ossCodeUri,
          'MemorySize': 3072,
          'Timeout': 300
        }
      }
    }
  };
}

function generateRosTemplateForNasCpInvoker(serviceName, bucketName, objectNames) {
  return {
    [`${serviceName}-NasCpInvoker`]: {
      'Type': 'ALIYUN::FC::FunctionInvoker',
      'DependsOn': 'MountTarget',
      'Properties': {
        'FunctionName': {
          'Fn::GetAtt': [
            'NasNasCpFunc',
            'FunctionName'
          ]
        },
        'ServiceName': {
          'Fn::GetAtt': [
            'Nas',
            'ServiceName'
          ]
        },
        'Event': {
          'Fn::Join': [
            '',
            [
              `{"dst": "/mnt/nas_dependencies/`,
              serviceName,
              '", "bucket": "',
              bucketName,
              `", "objectNames": ${JSON.stringify(objectNames)}, "rosCurl": "`,
              {
                'Fn::GetAtt': [
                  'WaitConHandle',
                  'CurlCli'
                ]
              },
              `"}`
            ]
          ]
        },
        'Async': true,
        'ExecuteVersion': 1
      }
    }
  };
}

function generateRosTemplateForDefaultOutputs() {
  return {
    'Outputs': {
      'CurlCli': {
        'Value': {
          'Fn::GetAtt': [
            'WaitConHandle',
            'CurlCli'
          ]
        }
      },
      'Data': {
        'Value': {
          'Fn::GetAtt': [
            'WaitCondition',
            'Data'
          ]
        }
      },
      'ErrorData': {
        'Value': {
          'Fn::GetAtt': [
            'WaitCondition',
            'ErrorData'
          ]
        }
      }
    }
  };
}

function generateRosTemplateForEventOutputs(bucketName, objectNames, serviceName) {
  return {
    'Outputs': {
      [`${serviceName}-Event`]: {
        'Description': 'function invoke event',
        'Value': {
          'Fn::Join': [
            '',
            [
              `{"dst": "/mnt/nas_dependencies/`,
              serviceName,
              '", "bucket": "',
              bucketName,
              `", "objectNames": ${JSON.stringify(objectNames)}, "rosCurl": "`,
              {
                'Fn::GetAtt': [
                  'WaitConHandle',
                  'CurlCli'
                ]
              },
              `"}`
            ]
          ]
        }
      }
    }
  };
}

function generateRosTemplateForRegionMap() {
  return {
    'Mappings': {
      'RegionMap': {
        'cn-shanghai': {
          'ZoneId': 'cn-shanghai-e'
        },
        'cn-hangzhou': {
          'ZoneId': 'cn-hangzhou-g'
        },
        'cn-qingdao': {
          'ZoneId': 'cn-qingdao-c'
        },
        'cn-beijing': {
          'ZoneId': 'cn-beijing-c'
        },
        'cn-zhangjiakou': {
          'ZoneId': 'cn-zhangjiakou-b'
        },
        'cn-huhehaote': {
          'ZoneId': 'cn-huhehaote-a'
        },
        'cn-shenzhen': {
          'ZoneId': 'cn-shenzhen-d'
        },
        'cn-hongkong': {
          'ZoneId': 'cn-hongkong-c'
        },
        'ap-southeast-1': {
          'ZoneId': 'ap-southeast-1a'
        },
        'ap-southeast-2': {
          'ZoneId': 'ap-southeast-2a'
        },
        'ap-southeast-5': {
          'ZoneId': 'ap-southeast-5a'
        },
        'ap-northeast-1': {
          'ZoneId': 'ap-northeast-1a'
        },
        'eu-central-a': {
          'ZoneId': 'eu-central-a'
        },
        'us-west-1': {
          'ZoneId': 'us-west-1a'
        },
        'us-east-1': {
          'ZoneId': 'us-east-1a'
        },
        'ap-south-1': {
          'ZoneId': 'ap-south-1a'
        }
      }
    }
  };
}

function generateSlsService(logConfig) {
  return {
    [logConfig.project]: {
      'Type': 'Aliyun::Serverless::Log',
      'Properties': {
        'Description': 'create by fun.',
        'Policies': [
          'AliyunLogFullAccess'
        ]
      },
      [logConfig.logstore]: {
        'Type': 'Aliyun::Serverless::Log::Logstore',
        'Properties': {
          'TTL': 10,
          'ShardCount': 1
        }
      }
    }
  };
}

const {
  parseYamlWithCustomTag
} = require('../parse');

function isOssUrl(url) {
  if (_.isEmpty(url)) { return false; }
  return url.startsWith('oss://');
}

async function checkZipCodeExist(client, objectName) {
  try {
    await client.head(objectName);
    return true;
  } catch (e) {
    if (e.name === 'NoSuchKeyError') {
      return false;
    }

    throw e;
  }
}


async function uploadToOss({ ossClient, zipPath,
  count, compressedSize, srcPath, tplPath
}) {

  const objectName = await util.md5(zipPath);
  await copyToLocalPackagePath({ tplPath, zipPath, objectName });
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipPath));

    const convertedSize = bytes(compressedSize, {
      unitSeparator: ' '
    });

    let log = '';
    if (count) {
      log = `\nA total of ` + yellow(`${count}`) + `${count === 1 ? ' file' : ' files'}` + ` files were compressed and the final size was` + yellow(` ${convertedSize}`);
    }

    console.log(green(`\n${srcPath} has been uploaded to OSS. objectName: ${objectName}.${log}`));
  } else {
    console.log(`\n${srcPath} has been uploaded to OSS, skiping.`);
  }
  return objectName;
}

async function zipCode(srcPath, ignore, zipName = 'code.zip', prefix, zlibOptions = {}) {

  const { randomDir, zipPath} = await generateRandomZipPath(zipName);
  const { count, compressedSize } = await zip.packTo(srcPath, ignore, zipPath, prefix, zlibOptions);

  return {
    zipPath,
    randomDir,
    count,
    compressedSize
  };
}

async function zipCodeToOss({ ossClient, codeUri, runtime, ignore, tplPath, nasConfig,
  serviceName, functionName,
  zipName = 'code.zip',
  prefix = '',
  useNas = false,
  zlibOptions = {}
}) {

  let objectName;

  if (codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war')) {
    const stat = await fs.stat(codeUri);

    objectName = await uploadToOss({ ossClient,
      zipPath: codeUri,
      compressedSize: stat.size,
      srcPath: codeUri,
      tplPath
    });
    return { objectName };
  }

  const { zipPath, randomDir, count, compressedSize } = await zipCode(codeUri, ignore, zipName, prefix, zlibOptions);

  if (count === 0) { return { isEmpty: true, objectName }; }

  const rs = await fc.nasAutoConfigurationIfNecessary({ stage: 'package', tplPath, compressedSize, useNas,
    nasConfig, runtime, codeUri,
    nasServiceName: serviceName,
    nasFunctionName: functionName
  });

  if (!rs.stop) {
    objectName = await uploadToOss({ ossClient, zipPath,
      srcPath: codeUri,
      compressedSize, count, tplPath
    });
  }
  await fs.remove(randomDir);

  return {
    stop: rs.stop,
    objectName
  };
}

async function uploadNasService(ossClient, tplPath) {
  const zipCodePath = path.resolve(__dirname, '../utils/fun-nas-server/dist/fun-nas-server.zip');

  if (!await fs.pathExists(zipCodePath)) {
    throw new Error('could not find ../utils/fun-nas-server/dist/fun-nas-server.zip');
  }
  const stat = await fs.stat(zipCodePath);
  const objectName = await uploadToOss({ ossClient,
    zipPath: zipCodePath,
    srcPath: zipCodePath,
    compressedSize: stat.size,
    tplPath
  });
  return `oss://${ossClient.options.bucket}/${objectName}`;
}

async function zipToOss(ossClient, srcPath, ignore, zipName = 'code.zip', prefix = '', tplPath, zlibOptions = {}) {
  const { randomDir, zipPath} = await generateRandomZipPath(zipName);

  const { count, compressedSize } = await zip.packTo(srcPath, ignore, zipPath, prefix, zlibOptions);
  if (count === 0) { return null; }

  const objectName = await util.md5(zipPath);
  await copyToLocalPackagePath({ tplPath, zipPath, objectName });
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipPath));

    const convertedSize = bytes(compressedSize, {
      unitSeparator: ' '
    });

    console.log(green(`\n${srcPath} has been uploaded to OSS. objectName: ${objectName}. A total of ` + yellow(`${count}`) + `${count === 1 ? ' file' : ' files'}` + ` files were compressed and the final size was` + yellow(` ${convertedSize}`)));
  } else {
    console.log(`\n${srcPath} has been uploaded to OSS, skiping.`);
  }

  await fs.remove(randomDir);
  return objectName;
}

async function copyToLocalPackagePath({ tplPath, zipPath, objectName }) {
  const dstPath = path.resolve(path.dirname(tplPath), '.fun', 'package', objectName);
  if (await fs.pathExists(dstPath)) {
    return;
  }
  await fs.copy(zipPath, dstPath);
}

async function processNasPythonPaths(tpl, tplPath) {
  const updatedTplContent = _.cloneDeep(tpl);

  for (const { serviceRes } of definition.findServices(updatedTplContent.Resources)) {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;

    if (_.isEmpty(nasConfig)) { continue; }
    const nasEnv = generateNasPythonPaths(nasConfig);

    for (const { functionRes } of definition.findFunctions(serviceRes)) {

      if (!_.includes(['python2.7', 'python3'], functionRes.Properties.Runtime)) { continue; }
      functionRes.Properties.EnvironmentVariables = mergeEnvs(functionRes, nasEnv);
    }
  }

  return updatedTplContent;
}

async function uploadAndUpdateFunctionCode({ tpl, tplPath, useNas, baseDir, ossClient }) {
  let updatedTplContent = _.cloneDeep(tpl);

  let processed;
  let zlibOptions = {};
  do {
    if (processed) {
      console.log(yellow(`\nFun will execute the ‘fun package’ again.`));
    }
    processed = false;

    const codeUriCache = new Map();

    for (const {serviceName, serviceRes, functionName, functionRes} of definition.findFunctionsInTpl(updatedTplContent)) {
      if (isOssUrl((functionRes.Properties || {}).CodeUri)) { continue; }

      const runtime = (functionRes.Properties || {}).Runtime;
      const codeUri = (functionRes.Properties || {}).CodeUri;
      const absCodeUri = path.resolve(baseDir, codeUri);

      if (!await fs.pathExists(absCodeUri)) {
        throw new Error(`codeUri ${absCodeUri} is not exist`);
      }
      if (codeUriCache.get(absCodeUri)) {
        functionRes.Properties.CodeUri = codeUriCache.get(absCodeUri);
        continue;
      }

      const ignore = await fc.generateFunIngore(baseDir, codeUri);

      const rs = await zipCodeToOss({
        ossClient, codeUri: absCodeUri, runtime, ignore, tplPath, useNas,
        serviceName, functionName, nasConfig: (serviceRes.Properties || {}).NasConfig,
        zlibOptions
      });

      if (!rs.objectName && rs.isEmpty) {
        throw new Error(`code.zip for Codeuri ${codeUri} could not be empty.`);
      }
      if (rs.stop) {
        processed = true;
        useNas = false;
        zlibOptions.level = 1;
        updatedTplContent = await getTpl(tplPath);
        break;
      }

      const resolveCodeUri = `oss://${ossClient.options.bucket}/${rs.objectName}`;
      functionRes.Properties.CodeUri = resolveCodeUri;
      codeUriCache.set(absCodeUri, resolveCodeUri);
    }
  } while (processed);

  return updatedTplContent;
}

async function transformFlowDefinition(baseDir, tpl) {
  const updatedTplContent = _.cloneDeep(tpl);
  const flowsNeedTransform = [];

  definition.iterateResources(
    updatedTplContent.Resources,
    definition.FLOW_RESOURCE,
    (flowName, flowRes) => {
      const { Properties: flowProperties = {} } = flowRes;
      if (!flowProperties.DefinitionUri && !flowProperties.Definition) {
        throw new Error(`${flowName} should have DefinitionUri or Definition`);
      }
      if (!flowProperties.Definition) {
        flowsNeedTransform.push(flowRes);
      }
    }
  );
  const definitionCache = new Map();
  for (const flowRes of flowsNeedTransform) {
    const { Properties: flowProperties } = flowRes;
    const definitionUri = flowProperties.DefinitionUri;
    const absDefinitionUri = path.resolve(baseDir, definitionUri);
    if (!await fs.pathExists(absDefinitionUri)) {
      throw new Error(`DefinitionUri ${absDefinitionUri} is not exist`);
    }

    if (definitionCache.get(absDefinitionUri)) {
      flowProperties.Definition = definitionCache.get(absDefinitionUri);
      continue;
    }

    const definitionObj = parseYamlWithCustomTag(
      absDefinitionUri,
      fs.readFileSync(absDefinitionUri, 'utf8')
    );
    const { definition, dependsOn } = fnf.transformFunctionInDefinition(
      definitionObj,
      tpl,
      {},
      true
    );
    delete flowProperties.DefinitionUri;
    flowProperties.Definition = {
      'Fn::Sub': definition
    };
    flowRes.DependsOn = dependsOn;
    definitionCache.set(absDefinitionUri, definition);
  }

  return updatedTplContent;
}

module.exports = {
  zipToOss,
  uploadNasService,
  generateSlsService,
  processNasPythonPaths,
  transformFlowDefinition,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForRegionMap,
  generateRosTemplateForNasConfig,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForNasService,
  generateRosTemplateForNasCpInvoker,
  generateRosTemplateForEventOutputs,
  generateRosTemplateForWaitCondition,
  generateRosTemplateForDefaultOutputs,
  generateRosTemplateForDefaultResources
};