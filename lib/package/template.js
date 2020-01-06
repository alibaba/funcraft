'use strict';

const fc = require('../fc');
const fnf = require('../fnf');
const fs = require('fs-extra');
const path = require('path');
const util = require('./util');
const zip = require('../package/zip');
const definition = require('../definition');

const { red, green } = require('colors');
const { isEmptyDir } = require('../nas/cp/file');
const { generateRandomZipPath } = require('../utils/path');

const _ = require('lodash');

function generateRosTemplateForNasConfig(userId, groupId) {
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
              {
                'Fn::GetAtt': [
                  'Nas',
                  'ServiceName'
                ]
              }
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

function generateRosTemplateForResources() {
  return {
    'Vpc': {
      'Type': 'ALIYUN::ECS::VPC',
      'Properties': {
        'Description': 'used for FC Application Repository',
        'CidrBlock': '10.0.0.0/8',
        'VpcName': 'RosTestVpcName'
      }
    },
    'SecurityGroup': {
      'Type': 'ALIYUN::ECS::SecurityGroup',
      'Properties': {
        'SecurityGroupName': 'RosTestSecurityGroupName',
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

function generateRosTemplateForNasService(ossCodeUri, bucketName, objectNames) {
  return {
    'Nas': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'down from oss and upload to nas.',
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
          'Timeout': 240
        }
      }
    },
    'NasCpInvoke': {
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
              '{"dst": "/mnt/nas_dependencies/',
              {
                'Fn::GetAtt': [
                  'Nas',
                  'ServiceName'
                ]
              },
              '", "bucket": "',
              bucketName,
              `", "objectNames": ${JSON.stringify(objectNames)}}`
            ]
          ]
        },
        'Async': true, //TODO: ros timeout when sync invoke
        'ExecuteVersion': 5
      }
    }
  };
}

function generateRosTemplateForOutputs(bucketName, objectNames) {
  return {
    'Outputs': {
      'Event': {
        'Description': 'function invoke event',
        'Value': {
          'Fn::Join': [
            '',
            [
              '{"dst": "/mnt/nas_dependencies/',
              {
                'Fn::GetAtt': [
                  'Nas',
                  'ServiceName'
                ]
              },
              '", "bucket": "',
              bucketName,
              `", "objectNames": ${JSON.stringify(objectNames)}}`
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

async function uploadNasService(ossClient) {
  const zipCodePath = path.resolve(__dirname, '../utils/fun-nas-server/dist/fun-nas-server.zip');

  if (!await fs.pathExists(zipCodePath)) {
    throw new Error('could not find ../utils/fun-nas-server/dist/fun-nas-server.zip');
  }

  const objectName = await util.md5(zipCodePath);
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipCodePath));
    console.log(green(`\n${zipCodePath} has been uploaded to OSS. objectName: ${objectName}`));
  } else {
    console.log(red(`\n${zipCodePath} has been uploaded to OSS, skiping.`));
  }

  return `oss://${ossClient.options.bucket}/${objectName}`;
}

async function zipToOss(ossClient, srcPath, ignore, zipName = 'code.zip') {
  const { randomDir, zipPath} = await generateRandomZipPath(zipName);

  await zip.packTo(srcPath, ignore, zipPath);

  const objectName = await util.md5(zipPath);
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipPath));
    console.log(green(`\n${srcPath} has been uploaded to OSS. objectName: ${objectName}`));
  } else {
    console.log(red(`\n${srcPath} has been uploaded to OSS, skiping.`));
  }

  await fs.remove(randomDir);
  return objectName;
}

async function uploadLocalNasDir(ossClient, baseDir, serviceNasMapping) {
  const objectNames = [];

  for (const serviceName in serviceNasMapping) {

    if (_.isEmpty(serviceNasMapping[serviceName])) {
      continue;
    }

    for (const { localNasDir } of serviceNasMapping[serviceName]) {
      const srcPath = path.resolve(baseDir, localNasDir);

      if (!await fs.pathExists(srcPath)) {
        console.warn(red(`\nwarning: ${srcPath} is not exist, skiping.`));
        continue;
      }
      if (await isEmptyDir(srcPath)) {
        console.warn(red(`\nwarning: ${srcPath} is empty directory, skiping.`));
        continue;
      }
      const objectName = await zipToOss(ossClient, srcPath, null, 'nas.zip');
      objectNames.push(objectName);
    }
  }

  return objectNames;
}

async function uploadAndUpdateFunctionCode(baseDir, tpl, ossClient) {
  const updatedTplContent = _.cloneDeep(tpl);
  const functionsNeedUpload = [];

  definition.iterateFunctions(updatedTplContent, (serviceName, serviceRes, functionName, functionRes) => {
    const codeUri = (functionRes.Properties || {}).CodeUri;

    if (isOssUrl(codeUri)) {
      return;
    }

    functionsNeedUpload.push({
      functionRes
    });
  });

  const codeUriCache = new Map();

  for (const { functionRes } of functionsNeedUpload) {
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
    const objectName = await zipToOss(ossClient, absCodeUri, ignore, 'code.zip');

    const resolveCodeUri = `oss://${ossClient.options.bucket}/${objectName}`;
    functionRes.Properties.CodeUri = resolveCodeUri;

    codeUriCache.set(absCodeUri, resolveCodeUri);
  }
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
    const definition = fnf.transformFunctionInDefinition(
      definitionObj,
      tpl,
      {},
      true
    );
    delete flowProperties.DefinitionUri;
    flowProperties.Definition = {
      'Fn::Sub': definition
    };
    definitionCache.set(absDefinitionUri, definition);
  }

  return updatedTplContent;
}

module.exports = {
  uploadLocalNasDir,
  uploadNasService,
  transformFlowDefinition,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForOutputs,
  generateRosTemplateForRegionMap,
  generateRosTemplateForNasConfig,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForResources,
  generateRosTemplateForNasService
};