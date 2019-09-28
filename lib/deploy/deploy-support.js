'use strict';

const fs = require('fs');
const util = require('util');

const { getCloudApiClient, getSlsClient, getMnsClient } = require('../client');

const {
  getOtsClient,
  getOtsPopClient,
  getFcClient } = require('../client');

const getProfile = require('../profile').getProfile;
const debug = require('debug')('fun:deploy');
const { processApiParameters } = require('./deploy-support-api');
const promiseRetry = require('../retry');
const ram = require('../ram');
const _ = require('lodash');
const readFile = util.promisify(fs.readFile);
const { green, red } = require('colors');

async function makeLogstoreIndex(projectName, logstoreName) {
  const sls = await getSlsClient();

  // create index if index not exist.
  console.log(`\t\tWaiting for log service logstore ${logstoreName} default index to be deployed...`);
  await promiseRetry(async (retry, times) => {
    try {
      try {
        await sls.getIndexConfig(projectName, logstoreName);
        return;
      } catch (ex) {
        if (ex.code !== 'IndexConfigNotExist') {
          debug('error when getIndexConfig, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

          throw ex;
        }
      }

      // create default logstore index. index configuration is same with sls console.
      debug('logstore index not exist, try to create a default index for project %s logstore %s', projectName, logstoreName);
      await sls.createIndex(projectName, logstoreName, {
        ttl: 10,
        line: {
          caseSensitive: false,
          chn: false,
          token: [...', \'";=()[]{}?@&<>/:\n\t\r']
        }
      });
      debug('create default index success for project %s logstore %s', projectName, logstoreName);
    } catch (ex) {
      debug('error when createIndex, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

      console.log(red(`\t\t\tretry ${times} times`));
      retry(ex);
    }
  });

  console.log(green(`\t\tlog service logstore ${logstoreName} default index deploy success`));
}

async function makeLogstore({
  projectName,
  logstoreName,
  ttl,
  shardCount
}) {
  const sls = await getSlsClient();

  let exists = true;
  await promiseRetry(async (retry, times) => {
    try {
      await sls.getLogStore(projectName, logstoreName);
    } catch (ex) {
      if (ex.code !== 'LogStoreNotExist') {
        debug('error when getLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

        console.log(red(`\t\tretry ${times} times`));

        retry(ex);
      } else { exists = false; }
    }
  });

  if (!exists) {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.createLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        debug('error when createLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);
        console.log(red(`\t\tretry ${times} times`));
        retry(ex);
      }
    });
  } else {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.updateLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        debug('error when updateLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

        if (ex.code !== 'ParameterInvalid' && ex.message !== 'no parameter changed') {
          console.log(red(`\t\tretry ${times} times`));
          retry(ex);
        } else {
          throw ex;
        }
      }
    });
  }
}

async function makeSlsProject(projectName, description) {
  const sls = await getSlsClient();

  let projectExist = true;

  await promiseRetry(async (retry, times) => {
    try {
      await sls.getProject(projectName);
    } catch (ex) {
      if (ex.code === 'Unauthorized') {
        throw new Error(red(`Log Service '${projectName}' may create by others, you should use a unique project name.`));
      } else if (ex.code !== 'ProjectNotExist') {
        debug('error when getProject, projectName is %s, error is: \n%O', projectName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      } else { projectExist = false; }
    }

    if (projectExist) {
      // no update project api
      // only description can be updated by console.
      debug(`sls project exists, but could not be updated`);
    } else {
      try {
        await sls.createProject(projectName, {
          description
        });
      } catch (ex) {
        if (ex.code === 'ProjectAlreadyExist') {
          throw new Error(red(`error: sls project ${projectName} already exist, it may be in other region or created by other users.`));
        } else {
          debug('error when createProject, projectName is %s, error is: \n%O', projectName, ex);

          console.log(red(`\tretry ${times} times`));
          retry(ex);
        }
      }
    }
  });
}

async function makeMnsTopic(topicName, properties) {
  var region = properties.Region;
  const mnsClient = await getMnsClient(topicName, region);

  // just for deepping copy
  var params = JSON.parse(JSON.stringify(properties));
  delete params.Region;

  await promiseRetry(async (retry, times) => {
    try {
      let res;
      res = await mnsClient.createTopic(topicName, params);
      console.log('mms create topic response status code = ', res.code);
    } catch (ex) {
      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });
}

async function makeCustomDomain({
  domainName,
  protocol,
  routeConfig,
  certConfig
}) {
  const fc = await getFcClient();
  var customDomain;
  await promiseRetry(async (retry, times) => {
    try {
      customDomain = await fc.getCustomDomain(domainName);
    } catch (ex) {
      if (ex.code !== 'DomainNameNotFound') {
        debug('error when getCustomDomain, domainName is %s, error is: \n%O', domainName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  });

  const options = {
    protocol
  };

  if (routeConfig) {
    Object.assign(options, {
      routeConfig
    });
  }

  if (Reflect.ownKeys(certConfig).length > 0) {
    let privateKey = certConfig.PrivateKey;
    let certificate = certConfig.Certificate;

    if (privateKey && privateKey.endsWith('.pem')) {
      certConfig.PrivateKey = await readFile(privateKey, 'utf-8');
    }
    if (certificate && certificate.endsWith('.pem')) {
      certConfig.Certificate = await readFile(certificate, 'utf-8');
    }
    Object.assign(options, {
      certConfig
    });
  }

  await promiseRetry(async (retry, times) => {
    try {
      if (!customDomain) {
        customDomain = await fc.createCustomDomain(domainName, options);
      } else {
        customDomain = await fc.updateCustomDomain(domainName, options);
      }
    } catch (ex) {
      debug('error when createCustomDomain or updateCustomDomain, domainName is %s, options is %j, error is: \n%O', domainName, options, ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  return customDomain;
}

async function makeGroup(group) {
  const ag = await getCloudApiClient();

  const groupName = group.name;
  const groupDescription = group.description;

  var findGroup;

  await promiseRetry(async (retry, times) => {
    try {
      var groups = await ag.describeApiGroups({
        GroupName: groupName
      });

      debug(`describeApiGroups response ${JSON.stringify(groups)}`);

      var list = groups.ApiGroupAttributes.ApiGroupAttribute;
      findGroup = list.find((item) => {
        return item.GroupName === groupName;
      });

      if (!findGroup) {
        findGroup = await ag.createApiGroup({
          GroupName: groupName,
          Description: groupDescription
        });
      }

    } catch (ex) {
      debug('error when makeGroup, error is: \n%O', ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  return findGroup;
}

function getDefaultRequestConfig(method, requestPath) {
  return {
    'requestProtocol': 'HTTP',
    'postBodyDescription': '',
    'requestMode': 'PASSTHROUGH'
  };
}

async function makeApi(group, {
  stageName,
  requestPath,
  method,
  roleArn,
  apiName,
  serviceName,
  functionName,
  serviceTimeout = 3000,
  auth = {},
  visibility = 'Private',
  requestConfig = {},
  resultConfig = {},
  requestParameters = [],
  serviceParameters = [],
  serviceParametersMap = [],
  description,
  forceNonceCheck,
  appCodeAuthType,
  allowSignatureMethod,
  disableInternet,
  webSocketApiType,
  errorCodeSamples
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const ag = await getCloudApiClient();

      const result = await ag.describeApis({
        ApiName: apiName,
        GroupId: group.GroupId
      });

      debug(`describeApis response: ${JSON.stringify(result)}`);

      var apiSummarys = result.ApiSummarys && result.ApiSummarys.ApiSummary;
      var api;

      if (apiSummarys) {
        api = apiSummarys.find(summary => summary.ApiName === apiName);
      }

      const mergedRequestConfig = Object.assign(getDefaultRequestConfig(method), {
        'requestHttpMethod': method,
        'requestPath': requestPath
      }, requestConfig);

      const { apiRequestParameters,
        apiServiceParameters,
        apiServiceParametersMap } = processApiParameters(requestParameters, serviceParameters, serviceParametersMap);

      const profile = await getProfile();

      var params = {
        GroupId: group.GroupId,
        ApiName: apiName,
        Visibility: visibility,
        Description: description || 'The awesome api generated by fun',
        AuthType: auth.type || 'ANONYMOUS',
        RequestConfig: JSON.stringify(mergedRequestConfig),
        RequestParameters: JSON.stringify(apiRequestParameters),
        ServiceParameters: JSON.stringify(apiServiceParameters),
        ServiceParametersMap: JSON.stringify(apiServiceParametersMap),
        ServiceConfig: JSON.stringify({
          'ServiceProtocol': 'FunctionCompute',
          'ContentTypeValue': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Mock': 'FALSE',
          'MockResult': '',
          'ServiceAddress': '',
          'ServicePath': '',
          'ServiceHttpMethod': '',
          'ContentTypeCatagory': 'DEFAULT',
          'ServiceVpcEnable': 'FALSE',
          'ServiceTimeout': serviceTimeout,
          FunctionComputeConfig: {
            FcRegionId: profile.defaultRegion,
            ServiceName: serviceName,
            FunctionName: functionName,
            RoleArn: roleArn
          }
        }),
        ResultType: resultConfig.resultType || 'passthrough',
        ResultSample: resultConfig.resultSample || 'result sample',
        FailResultSample: resultConfig.failResultSample || 'failed samples',
        DisableInternet: disableInternet || false,
        ErrorCodeSamples: _.isEmpty(errorCodeSamples) ? [] : JSON.stringify(errorCodeSamples)
      };

      if (allowSignatureMethod) {
        Object.assign(params, {
          'allowSignatureMethod': allowSignatureMethod
        });
      }

      if (webSocketApiType) {
        Object.assign(params, {
          'WebSocketApiType': webSocketApiType
        });
      }

      if (appCodeAuthType) {
        Object.assign(params, {
          'AppCodeAuthType': appCodeAuthType
        });
      }

      if (auth.type === 'APPOPENID' || auth.type === 'OPENID') {
        var openidConf = auth.config || {};
        params.OpenIdConnectConfig = JSON.stringify({
          'IdTokenParamName': openidConf.idTokenParamName,
          'OpenIdApiType': openidConf.openIdApiType || 'BUSINESS',
          'PublicKeyId': openidConf.publicKeyId,
          'PublicKey': openidConf.publicKey
        });
      }

      if (forceNonceCheck !== undefined) {
        Object.assign(params, {
          ForceNonceCheck: forceNonceCheck
        });
      }

      debug('api params is %j', params);

      if (!api) {
        debug('create api');
        api = await ag.createApi(params);
      } else {
        debug('modify api');
        await ag.modifyApi(Object.assign(params, {
          ApiId: api.ApiId
        }));
      }

      debug('deploy api, params is GroupId %s, ApiId %s, StageName: %s', group.GroupId, api.ApiId, stageName);

      await ag.deployApi({
        GroupId: group.GroupId,
        ApiId: api.ApiId,
        StageName: stageName,
        Description: `deployed by fun at ${new Date().toISOString()}`
      });

      const apiDetail = await ag.describeApi({
        GroupId: group.GroupId,
        ApiId: api.ApiId
      });

      console.log('    URL: %s %s://%s%s',
        green(apiDetail.RequestConfig.RequestHttpMethod),
        apiDetail.RequestConfig.RequestProtocol.toLowerCase(),
        group.SubDomain,
        apiDetail.RequestConfig.RequestPath);
      apiDetail.DeployedInfos.DeployedInfo.forEach((info) => {
        if (info.DeployedStatus === 'DEPLOYED') {
          console.log(green(`      stage: ${info.StageName}, deployed, version: ${info.EffectiveVersion}`));
        } else {
          console.log(`      stage: ${info.StageName}, undeployed`);
        }
      });
    } catch (ex) {
      if (ex.code === 'DuplicateRequestParamaters') {
        throw new Error(red(ex.message));
      } else {
        debug('error when makeApi, error is: \n%O', ex);

        console.log(red(ex.message));
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
      scrollTo;
    }
  });
}

async function makeApiTrigger({
  serviceName,
  functionName,
  triggerName,
  method = 'GET',
  requestPath,
  restApiId
}) {
  if (!restApiId) {
    const role = await ram.makeRole('apigatewayAccessFC');
    debug('%j', role);

    const apiGroup = await makeGroup({
      name: `fc_${serviceName}_${functionName}`,
      description: `api group for function compute ${serviceName}/${functionName}`
    });

    const apiName = `fc_${serviceName}_${functionName}_${requestPath.replace(/\//g, '_')}_${method}`;

    makeApi(apiGroup, {
      stageName: 'RELEASE',
      requestPath,
      method,
      roleArn: role.Role.Arn,
      apiName,
      serviceName,
      functionName
    });
  }
}

async function makeOtsInstance(instanceName, clusterType, description) {
  const otsPopClient = await getOtsPopClient();

  await promiseRetry(async (retry, times) => {
    try {
      try {
        await otsPopClient.request('GetInstance', {
          'InstanceName': instanceName
        });

        return;
      } catch (ex) {
        if (ex.code !== 'NotFound') {
          throw ex;
        }
      }

      await otsPopClient.request('InsertInstance', {
        InstanceName: instanceName,
        ClusterType: clusterType,
        Description: description
      }, {
        method: 'POST'
      });
    } catch (ex) {
      if (ex.code === 'AuthFailed'
        || ex.code === 'InvalidParameter'
        || ex.code === 'QuotaExhausted') {
        throw new Error(red(ex.message));
      } else {
        debug('error when makeOtsInstance, error is: \n%O', ex);

        console.error(red(`retry ${times} times`));
        retry(ex);
      }
    }
  });
}

async function makeOtsTable({
  instanceName,
  tableName,
  primaryKeys
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const client = await getOtsClient(instanceName);

      var params = {
        tableMeta: {
          tableName: tableName,
          primaryKey: primaryKeys
        },
        reservedThroughput: {
          capacityUnit: {
            read: 0,
            write: 0
          }
        },
        tableOptions: {
          timeToLive: -1,
          maxVersions: 1
        },
        streamSpecification: {
          enableStream: true, // default true to support tablestore trigger
          expirationTime: 1
        }
      };

      const listData = await client.listTable();

      if (listData.tableNames.length > 0 && listData.tableNames.indexOf(tableName) !== -1) {
        console.log('tablestore table already exists, but could not be updated');
      } else {
        await client.createTable(params);
      }
    } catch (ex) {
      debug('error when makeOtsTable, error is: \n%O', ex);

      console.log(red(`retry ${times} times`));
      retry(ex);
    }
  });
}

module.exports = {
  makeApi,
  makeApiTrigger,
  makeGroup,
  makeOtsTable,
  makeOtsInstance,
  makeSlsProject,
  makeLogstore,
  makeLogstoreIndex,
  makeCustomDomain,
  makeMnsTopic
};