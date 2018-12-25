'use strict';

const func = require('../../function');
const streams = require('memory-streams');

const FC_HTTP_PARAMS = 'x-fc-http-params';

const debug = require('debug')('fun:local');

const getProfile = require('../../profile').getProfile;

const definition = require('../../definition');

const { green, red, yellow } = require('colors');

const getRawBody = require('raw-body');
const httpParser = require('http-string-parser');
const FC = require('@alicloud/fc2');

// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
/* eslint-disable */
const headerFieldRe = new RegExp('^[\x00-\x7F]+$');
/* eslint-enable */

function validateHeader(headerKey, headerValue) {

  if (!headerKey.trim() || !headerFieldRe.test(headerKey)) {
    return false;
  }

  if (typeof headerValue === 'string') {
    return headerFieldRe.test(headerValue);
  } else if (Array.isArray(headerValue)) {
    for (let value of headerValue) {
      if (!headerFieldRe.test(value)) { return false; }
    }
  } else { return false; }

  return true;
}

async function getHttpRawBody(req) {
  // will return buffer when encoding not specified for raw-body
  const event = await getRawBody(req, {
    length: req.headers['content-length']
  });

  return event;
}

function filterFunctionResponseAndExecutionInfo(response) {
  let responseBegin = false;
  let executionInfoBegin = false;

  const httpResponse = [];
  let executionInfo = '';

  debug('response is');
  for (let line of response) {
    debug(line);
    if (line.startsWith('--------------------response begin-----------------')) {
      responseBegin = true;
      continue;
    } else if (line.startsWith('--------------------response end-----------------')) {
      responseBegin = false;
      continue;
    } else if (line.startsWith('--------------------execution info begin-----------------')) {
      executionInfoBegin = true;
      continue;
    } else if (line.startsWith('--------------------execution info end-----------------')) {
      executionInfoBegin = false;
      continue;
    }

    if (responseBegin) {
      httpResponse.push(line);
    } else if (executionInfoBegin) {
      executionInfo = line;
    } else {
      console.log(line);
    }
  }

  return [httpResponse, executionInfo];
}

// { key1: value1, key2: [value2, value3] } to { key1: [value1], key2: [value2, value3] }
function normalizeMultiValues(maps) {
  const normalizedMap = {};

  if (maps) {
    for (var k in maps) {
      if (Array.isArray(maps[k])) {
        normalizedMap[k] = maps[k];
      } else {
        normalizedMap[k] = [maps[k]];
      }
    }
  }

  return normalizedMap;
}

function generateHttpParams(req, pathPrefix) {
  const requestURI = req.originalUrl;
  const method = req.method;
  const path = req.path.substring(pathPrefix.length);
  const clientIP = req.ip;

  // for nodejs and python and php
  const headersMap = normalizeMultiValues(req.headers);
  const queriesMap = normalizeMultiValues(req.query); 

  const params = {
    requestURI,
    method,
    path,
    clientIP,
    queriesMap,
    headersMap 
  };

  const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');

  return encodedParams;
}

function parseHttpTriggerHeaders(base64Headers) {
  let headers = {};

  if (base64Headers) {
    const rawHeaders = Buffer.from(base64Headers, 'base64').toString();
    headers = JSON.parse(rawHeaders);
  }

  return headers;
}

function parseHeadersAndBodyAndExecutionInfoAndProcessOutput(outputStream) {
  // 这里的 outputStream 包含 mock.sh 原始内容，以及 base64 后的 curl 的 response，因此可以直接按照 utf8 toString
  const response = outputStream.toString().split('\n');

  const [functionResponse, executionRawInfo] = filterFunctionResponseAndExecutionInfo(response);

  const functionBase64Response = functionResponse.join('\n');

  // 这里将 curl 的 response 按照 base64 解码，得到元数据
  // 然后通过使用 binary 将 body 中的二进制数据编码，后面 parser 内部会调用 toString，转换成 binary 后，可以安全地进行 parse 了。
  const rawResponse = Buffer.from(functionBase64Response, 'base64').toString('binary');

  const parsedResponse = httpParser.parseResponse(rawResponse);

  // 将 binary 的 body 转换回来
  const body = Buffer.from(parsedResponse.body, 'binary');

  // parse requestId

  const executionInfo = {};

  if (executionInfo) {
    const rawExecutionInfo = Buffer.from(executionRawInfo, 'base64').toString();
    const infos = rawExecutionInfo.split('\n');

    executionInfo.requestId = infos[0];
    executionInfo.billedTime = infos[1];
    executionInfo.memoryLimit = infos[2];
    executionInfo.memoryUsage = infos[3];

    debug('exectionInfo: %j', executionInfo);
  }

  return Object.assign({
    statusCode: parsedResponse.statusCode,
    headers: parsedResponse.headers,
    body
  }, executionInfo);
}

function logsHttpTrigger(serverPort, serviceName, functionName, triggerName, endpoint, httpMethods, authType) {
  console.log(green(`http trigger ${triggerName} of ${serviceName}/${functionName} was registered`));
  console.log('\turi: ' + yellow(`http://localhost:${serverPort}${endpoint}/`));
  console.log(`\tmethods: ` + yellow(httpMethods));
  console.log(`\tauthType: ` + yellow(authType));
  console.log();
}

function logsApi(serverPort, serviceName, functionName, endpoint) {
  console.log(green(`api ${serviceName}/${functionName} was registered`));
  console.log('\turi: ' + yellow(`http://localhost:${serverPort}${endpoint}/`));
  console.log();
}

function responseApi(resp, outputStream, errorStream) {
  const errorResponse = errorStream.toString();

  let { statusCode, body, requestId, billedTime, memoryUsage } = parseHeadersAndBodyAndExecutionInfoAndProcessOutput(outputStream);

  const headers = {
    'content-type': 'application/json',
    'x-fc-request-id': requestId,
    'x-fc-invocation-duration': billedTime,
    'x-fc-invocation-service-version': 'LATEST',
    'x-fc-max-memory-usage': memoryUsage,
    'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
  };

  resp.status(statusCode);

  // todo: fix body 后面多个换行的 bug
  if (errorResponse) { // process HandledInvocationError and UnhandledInvocationError
    console.error(red(errorResponse));

    if (body.toString()) {
      headers['x-fc-error-type'] = 'HandledInvocationError';
    } else {
      headers['x-fc-error-type'] = 'UnhandledInvocationError';
      body = {
        'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
      };
    }
  }

  resp.set(headers);
  resp.send(body);
}

function responseHttpTrigger(res, outputStream, errorStream) {
  // todo: real-time processing ?
  const errorResponse = errorStream.toString();

  const { statusCode, headers, body, billedTime, memoryUsage } = parseHeadersAndBodyAndExecutionInfoAndProcessOutput(outputStream);

  if (!errorResponse && statusCode.startsWith('2')) {
    const base64HttpParams = headers[FC_HTTP_PARAMS];

    const httpParams = parseHttpTriggerHeaders(base64HttpParams);

    res.status(httpParams.status);

    const httpParamsHeaders = httpParams.headersMap || httpParams.headers;    
    for (const headerKey in httpParamsHeaders) {
      if (!{}.hasOwnProperty.call(httpParamsHeaders, headerKey)) { continue; }

      const headerValue = httpParamsHeaders[headerKey];

      if (validateHeader(headerKey, headerValue)) {
        res.setHeader(headerKey, headerValue);
      }
    }
    res.send(body);
  } else {
    console.log(red(errorResponse));
    console.log(red(body));

    res.status(statusCode || 500);
    res.setHeader('Content-Type', 'application/json');
    const msg = {
      'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
    };
    res.send(msg);
  }
}

async function validateSignature(req, res, method) {
  const profile = await getProfile();

  const signature = FC.getSignature(profile.accessKeyId, profile.accessKeySecret, method, req.path, req.headers, req.queries);

  const clientSignature = req.headers['authorization'];

  if (signature !== clientSignature) {
    res.status(500);
    res.send(`Signature doesn't match, request signature is ${clientSignature}, but server signature is ${signature}`);
    return false;
  }

  return true;
}

function registerHttpTriggers(app, serverPort, httpTriggers, debugPort, debugIde, tplPath) {
  for (let { serviceName, serviceRes,
    functionName, functionRes,
    triggerName, triggerRes } of httpTriggers) {

    debug('serviceName: ' + serviceName);
    debug('functionName: ' + functionName);
    debug('tiggerName: ' + triggerName);
    debug('triggerRes: ' + triggerRes);

    const endpointPrefix = `/2016-08-15/proxy/${serviceName}/${functionName}`;
    const endpoint = `${endpointPrefix}*`;

    const triggerProps = triggerRes.Properties;
    const httpMethods = triggerProps.Methods;
    const authType = triggerProps.AuthType;
    const isAnonymous = authType === 'ANONYMOUS';

    for (let method of httpMethods) {

      const nasConfig = definition.findNasConfigInService(serviceRes);

      app[method.toLowerCase()](endpoint, async (req, res) => {

        const httpParams = generateHttpParams(req, endpointPrefix);

        const event = await getHttpRawBody(req);

        if (!isAnonymous) {
          // check signature
          if (!await validateSignature(req, res, method)) {return;}
        }

        const outputStream = new streams.WritableStream();
        const errorStream = new streams.WritableStream();

        await func.invokeFunction(serviceName, functionName, functionRes, debugPort, event, debugIde, httpParams, outputStream, errorStream, nasConfig, tplPath, true);

        responseHttpTrigger(res, outputStream, errorStream);
      });
    }

    logsHttpTrigger(serverPort, serviceName, functionName, triggerName, endpointPrefix, httpMethods, authType);
  }
}

function registerApis(app, serverPort, functions, debugPort, debugIde, tplPath) {
  for (let { serviceName, serviceRes,
    functionName, functionRes } of functions) {

    const nasConfig = definition.findNasConfigInService(serviceRes);

    debug('serviceName: ' + serviceName);
    debug('functionName: ' + functionName);

    const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;

    app.post(endpoint, async (req, res) => {
      const event = await getHttpRawBody(req);

      const outputStream = new streams.WritableStream();
      const errorStream = new streams.WritableStream();

      // check signature
      if (!await validateSignature()) {return;}

      await func.invokeFunction(serviceName, functionName, functionRes, debugPort, event, debugIde, null, outputStream, errorStream, nasConfig, tplPath, true);

      responseApi(res, outputStream, errorStream);
    });

    logsApi(serverPort, serviceName, functionName, endpoint);
  }
}

module.exports = {
  registerHttpTriggers, registerApis,
  validateHeader, filterFunctionResponseAndExecutionInfo,
  generateHttpParams, parseHttpTriggerHeaders,
  parseHeadersAndBodyAndExecutionInfoAndProcessOutput,
  responseApi, responseHttpTrigger, validateSignature,
  normalizeMultiValues
};