'use strict';

const fc = require('../fc');
const fnf = require('../fnf');
const fs = require('fs-extra');
const path = require('path');
const util = require('./util');
const zip = require('../package/zip');
const definition = require('../definition');

const { red } = require('colors');
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

function generateRosTemplateForParameters() {
  return {
    'Parameters': {
      'BucketName': {
        'Type': 'String',
        'Default': 'fun-local-test'
      },
      'ObjectName': {
        'Type': 'String',
        'Default': 'nas.zip'
      }
    }
  };
}

function generateRosTemplateForResources(bucketName, objectNames) {
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
        'ZoneId': 'cn-shanghai-e',
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
        'AccessGroupName': {
          'Ref': 'AccessGroup'
        },
        'FileSystemId': {
          'Ref': 'FileSystem'
        }
      }
    },
    'AccessGroup': {
      'Type': 'ALIYUN::NAS::AccessGroup',
      'Properties': {
        'AccessGroupType': 'Vpc',
        'Description': 'ros-access-group',
        'AccessGroupName': {
          'Fn::Join': [
            '_',
            [
              {
                'Ref': 'ALIYUN::StackName'
              },
              'ros-access-group-name'
            ]
          ]
        }
      }
    },
    'AccessRule': {
      'Type': 'ALIYUN::NAS::AccessRule',
      'Properties': {
        'UserAccessType': 'no_squash',
        'Priority': 100,
        'AccessGroupName': {
          'Ref': 'AccessGroup'
        },
        'SourceCidrIp': '0.0.0.0/0'
      }
    },
    'Nas': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'just a test',
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
          'Handler': 'index.handler',
          'Runtime': 'nodejs8',
          'CodeUri': 'oss://fun-local-test/ddb82f3abdc482ba528db3846b54a912',
          'MemorySize': 512,
          'Timeout': 120
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
              '", "objectName": "',
              objectNames,
              '"}'
            ]
          ]
        },
        'Async': false,
        'ExecuteVersion': 5
      }
    }
  };
}

function generateRosTemplateForUxiliaryFunction(ossCodeUri) {
  return {
    'Nas': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'just a test',
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
          'Handler': 'index.handler',
          'Runtime': 'nodejs8',
          'CodeUri': ossCodeUri,
          'MemorySize': 512,
          'Timeout': 120
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
              {
                'Ref': 'BucketName'
              },
              '", "objectName": "',
              {
                'Ref': 'ObjectName'
              },
              '"}'
            ]
          ]
        },
        'Async': false,
        'ExecuteVersion': 5
      }
    }
  };
}

function generateRosTemplateForOutputs() {
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
              {
                'Ref': 'BucketName'
              },
              '", "objectName": "',
              {
                'Ref': 'ObjectName'
              },
              '"}'
            ]
          ]
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

async function uploadaUxiliaryFunction(ossClient) {
  const srcPath = path.resolve(__dirname, 'index.js');
  const objectName = await zipToOss(ossClient, srcPath, null);
  return `oss://${ossClient.options.bucket}/${objectName}`;
}

async function zipToOss(ossClient, srcPath, ignore) {
  const { randomDir, zipPath} = await generateRandomZipPath('nas.zip');

  await zip.packTo(srcPath, ignore, zipPath);

  const objectName = await util.md5(zipPath);
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipPath));
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

      const objectName = await zipToOss(ossClient, srcPath, null);
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
    const objectName = await zipToOss(ossClient, absCodeUri, ignore);

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
  uploadaUxiliaryFunction,
  transformFlowDefinition,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForOutputs,
  generateRosTemplateForNasConfig,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForParameters,
  generateRosTemplateForResources,
  generateRosTemplateForUxiliaryFunction
};