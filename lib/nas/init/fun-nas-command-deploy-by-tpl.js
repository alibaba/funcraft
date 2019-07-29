/* eslint-disable no-unused-vars */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const request = require('request');
const mkdirSync = require('mkdirp-sync');
// eslint-disable-next-line no-unused-vars

const { getProfile, mark } = require('../../profile');

const getTpl = require('../../tpl').getTpl;
const validate = require('../../validate/validate');


const { green} = require('colors');

const _ = require('lodash');


const FUN_NAS_SERVICE_PREFIX = 'fun-nas-';
const FUN_NAS_FUNCTION = 'fun-nas-function';
const OSSURL = 'https://buc-demo.oss-cn-shanghai.aliyuncs.com/fun-nas-server.zip';

function getFcNasFunctionCode(baseDir) {
  return new Promise(function (resolve, reject) {
    var tmpDir = path.join(baseDir, '.fun_nas_tmp');
    if (!fs.existsSync(tmpDir) || fs.existsSync(tmpDir) && fs.statSync(tmpDir).isFile()) {
      mkdirSync(tmpDir, function (err) {
        if (err) {
          console.error(err);
          reject(err);
        }
      });
    }
    var filename = path.join(tmpDir, 'fun-nas-proj.zip');
    var stream = fs.createWriteStream(filename);
    request(OSSURL).pipe(stream).on('close', function () {
      console.log('oss code downloada complete');
      resolve(filename);
    });
  });
}

async function deployNasFunction(tplPath) {
  await validate(tplPath);
  const timeoutInSecond = 600;
  const profile = await getProfile();

  console.log(`using region: ${profile.defaultRegion}`);
  console.log(`using accountId: ${mark(profile.accountId)}`);
  console.log(`using accessKeyId: ${mark(profile.accessKeyId)}`);
  console.log(`using timeout: ${timeoutInSecond}`);

  console.log('');

  const tpl = await getTpl(tplPath);
  
  const baseDir = path.resolve(tplPath, '..');

  var codeFile = await getFcNasFunctionCode(baseDir);
 

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      var serviceName = FUN_NAS_SERVICE_PREFIX + name;
      console.log(`Waiting for service ${serviceName} to be deployed...`);

      if (resource.Properties !== {}) {
        if (_.isEmpty(resource.Properties.NasConfig)) {
          console.log('Lake of nasConfig, please add your nas config and retry.');
          continue;
        }
        else {
          if (resource.Properties.NasConfig !== 'Auto' && resource.Properties.NasConfig !== 'auto') {
            if (_.isEmpty(resource.Properties.VpcConfig)) {
              console.log('Lake of vpcConfig, please add your vpc config and retry.');
              continue;
            }
          }
          resource.Properties.LogConfig = {
            Project: 'tes-log',
            Logstore: 'test-log' 
          };
          resource.Properties.Policies = ['AliyunECSNetworkInterfaceManagementAccess', 'AliyunOSSFullAccess', 'AliyunLogFullAccess'];
          
        }
        
        resource.Properties.InternetAccess = null;
        resource.Properties.Description = 'fun nas command service';
        
      } else {
        console.log('Lake of Properties.');
        continue;
      }
      
      for (let [k, v] of Object.entries(resource)) {
        if ((v || {}).Type === 'Aliyun::Serverless::Function') {
          delete resource[k];
        }
      }
      var functonAttr = {
        Type: 'Aliyun::Serverless::Function',
        Properties: {
          Handler: 'index.handler',
          Runtime: 'nodejs8',
          CodeUri: codeFile,
          Timeout: timeoutInSecond,
          EnvironmentVariables: {
            PATH: '/code/.fun/root/usr/bin'
          }
        },
        Events: {
          httpTrigger: {
            Type: 'HTTP',
            Properties: {
              AuthType: 'FUNCTION',
              Methods: ['POST', 'GET']
            }
          }
        }
      };
      resource[FUN_NAS_FUNCTION] = functonAttr;
      process.env.FUN_VERBOSE = 4;
      await require('../../deploy/deploy-by-tpl').deployService(baseDir, serviceName, resource);
      console.log(green(`service ${name} deploy success\n`));
    }
  }
  fs.unlink(codeFile, (err) => {
    if (err) { console.log(err); }
  });

}

module.exports = { deployNasFunction };