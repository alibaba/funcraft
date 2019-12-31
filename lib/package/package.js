'use strict';

const { getOssClient } = require('../client');
const { green, yellow } = require('colors');
const { validateNasAndVpcConfig, SERVICE_RESOURCE, iterateResources, isNasAutoConfig, getUserIdAndGroupId } = require('../definition');
const { getTpl, detectNasBaseDir, getNasYmlPath } = require('../tpl');

const nas = require('../nas');
const path = require('path');
const util = require('../import/utils');
const template = require('./template');
const nasSupport = require('../nas/support');

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
      'AccessGroupName': {
        'Type': 'String',
        'Default': 'ros-default-group-name11'
      },
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
        'ZoneId': 'cn-hangzhou-g',
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
          'Ref': 'AccessGroupName'
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

async function processNasAutoToRosTemplate(tpl) {
  const cloneTpl = _.cloneDeep(tpl);

  const servicesNeedUpdate = [];
  iterateResources(cloneTpl.Resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    if (isNasAutoConfig(nasConfig)) {
      servicesNeedUpdate.push({
        serviceName,
        serviceRes
      });
    }
  });

  for (const { serviceRes } of servicesNeedUpdate) {
    const serviceProp = (serviceRes.Properties || {});
    const nasConfig = serviceProp.NasConfig;

    const { userId, groupId } = getUserIdAndGroupId(nasConfig);

    serviceProp.vpcConfig = generateRosTemplateForVpcConfig();
    serviceProp.nasConfig = generateRosTemplateForNasConfig(userId, groupId);
  }

  Object.assign(cloneTpl.Resources, generateRosTemplateForResources());
  Object.assign(cloneTpl, generateRosTemplateForParameters());

  return cloneTpl;
}

async function pack(tplPath, bucket, outputTemplateFile) {

  const tpl = await getTpl(tplPath);
  validateNasAndVpcConfig(tpl.Resources);

  const baseDir = path.dirname(tplPath);
  const ossClient = await getOssClient(bucket);

  const updatedTpl = await template.uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);
  const updatedFlowTpl = await template.transformFlowDefinition(baseDir, updatedTpl);

  const serviceNasMapping = await nas.convertTplToServiceNasMappings(detectNasBaseDir(tplPath), updatedFlowTpl);
  const mergedNasMapping = await nasSupport.mergeNasMappingsInNasYml(getNasYmlPath(tplPath), serviceNasMapping);

  // const nasPackageEnabled = false;
  // if (nasPackageEnabled) {
  // }

  await template.uploadLocalNasDir(ossClient, baseDir, mergedNasMapping);
  const updatedRosTpl = await processNasAutoToRosTemplate(updatedFlowTpl);

  let packedYmlPath;

  if (outputTemplateFile) {
    packedYmlPath = path.resolve(process.cwd(), outputTemplateFile);
  } else {
    packedYmlPath = path.join(process.cwd(), 'template.packaged.yml');
  }

  util.outputTemplateFile(packedYmlPath, updatedRosTpl);

  console.log(green('\nPackage success'));

  showPackageNextTips(packedYmlPath);
}

function showPackageNextTips(packedYmlPath) {
  const deployTip = 'fun deploy';

  const relative = path.relative(process.cwd(), packedYmlPath);

  let templateParam = '';

  const DEFAULT_PACKAGED_YAML_NAME = 'template.packaged.yml';

  if (relative !== DEFAULT_PACKAGED_YAML_NAME) {
    templateParam = ` -t ${relative}`;
  }

  console.log(yellow(`\nTips for next step
======================
* Deploy Resources: ${deployTip}${templateParam}`));
}

module.exports = {
  pack
};