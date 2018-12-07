'use strict';

const path = require('path');

var express = require('express');
var app = express();

const getRawBody = require('raw-body');

const { red } = require('colors');

const httpParser = require('http-string-parser');

const FC = require('@alicloud/fc2');

const { detectTplPath, getTpl } = require('../../tpl');
const validate = require('../../validate/validate');
const debug = require('debug')('fun:local');

const getProfile = require('../../profile').getProfile;

const { findHttpTriggersInTpl, findFunctionsInTpl } = require('../../definition');

const docker = require('../../docker');
const streams = require('memory-streams');

const { getDebugPort, getDebugIde } = require('../../debug');

const serverPort = 8000;
const FC_HTTP_PARAMS = 'x-fc-http-params';

// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
const headerFieldRe = new RegExp('^[\x00-\x7F]+$');

function validHeader(headerKey, headerValue) {
  if (!headerKey.trim() || !headerFieldRe.test(headerKey)) {
    return false;
  }

  if (!headerValue.trim() || !headerFieldRe.test(headerValue)) {
    return false;
  }

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

  for (let line of response) {
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

    debug('exectionInfo: %j' + executionInfo);
  }

  return Object.assign({
    headers: parsedResponse.headers,
    body
  }, executionInfo);
}

function generateHttpParams(req, pathPrefix) {
  const requestURI = req.originalUrl;
  const method = req.method;
  const path = req.path.substring(pathPrefix.length);
  const clientIP = req.ip;
  const queries = req.query;

  const headers = req.headers;

  const params = {
    requestURI,
    method,
    path,
    clientIP,
    queries,
    headers
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

function registerApis(app, functions, debugPort, debugIde) {
  for (let { serviceName, functionName, functionRes } of functions) {

    debug('serviceName: ' + serviceName);
    debug('functionName: ' + functionName);

    const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;

    console.log('endpoint is : ' + endpoint);

    app.post(endpoint, async (res, resp) => {
      const event = await getHttpRawBody(res);

      const outputStream = new streams.WritableStream();
      const errorStream = new streams.WritableStream();

      await docker.invokeFunction(serviceName, functionName, functionRes, debugPort, event, debugIde, null, outputStream, errorStream);

      const errorResponse = errorStream.toString();

      let { body, requestId, billedTime, memoryUsage } = parseHeadersAndBodyAndExecutionInfoAndProcessOutput(outputStream);

      const headers = {
        'content-type': 'application/json',
        'x-fc-request-id': requestId, 
        'x-fc-invocation-duration': billedTime,
        'x-fc-invocation-service-version': 'LATEST',
        'x-fc-max-memory-usage': memoryUsage,
        'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
      };

      resp.status(200);

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
    });
  }
}

function registerHttpTriggers(app, httpTriggers, debugPort, debugIde) {
  for (let { serviceName, functionName, functionRes,
    triggerName, triggerRes } of httpTriggers) {

    debug('serviceName: ' + serviceName);
    debug('functionName: ' + functionName);
    debug('tiggerName: ' + triggerName);
    debug('triggerRes: ' + triggerRes);

    const endpointPrefix = `/2016-08-15/proxy/${serviceName}/${functionName}`;
    const endpoint = `${endpointPrefix}/*`;

    const triggerProps = triggerRes.Properties;
    const httpMethods = triggerProps.Methods;
    const isAnonymous = triggerProps.AuthType === 'ANONYMOUS';

    for (let method of httpMethods) {

      app[method.toLowerCase()](endpoint, async (req, res) => {

        const httpParams = generateHttpParams(req, endpointPrefix);

        const event = await getHttpRawBody(req);

        const outputStream = new streams.WritableStream();
        const errorStream = new streams.WritableStream();

        // todo: need to check sign
        if (!isAnonymous) {
          // todo: must fun config before
          const profile = await getProfile();

          const signature = FC.getSignature(profile.accessKeyId, profile.accessKeySecret, method, req.path, req.headers, req.query);
          const clientSignature = req.headers['authorization'];

          if (signature !== clientSignature) {
            res.status(500).send(`Signature doesn't match, request signature is ${clientSignature}, but server signature is ${signature}`);
            return;
          }
        }

        await docker.invokeFunction(serviceName, functionName, functionRes, debugPort, event, debugIde, httpParams, outputStream, errorStream);

        // todo: 实时处理，而不是最后处理
        const errorResponse = errorStream.toString();
        const { headers, body } = parseHeadersAndBodyAndExecutionInfoAndProcessOutput(outputStream);

        if (!errorResponse) {
          
          const base64HttpParams = headers[FC_HTTP_PARAMS];

          const httpParams = parseHttpTriggerHeaders(base64HttpParams);

          res.status(httpParams.status);

          const httpParamsHeaders = httpParams.headers;

          for (const headerKey in httpParamsHeaders) {
            if (!{}.hasOwnProperty.call(httpParamsHeaders, httpParamsHeaders)) {continue;}

            const headerValue = httpParamsHeaders[headerKey];

            if (validHeader(headerKey, headerValue)) {
              res.setHeader(headerKey, headerValue);
            }
          }
          res.send(body);
        } else {
          console.log(errorResponse);
          res.status(500).end('your function occur errors');
        }
      });
    }
  }
}

async function start(options) {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    console.error(red('Current folder not a fun project'));
    console.error(red('The folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
    process.exit(-1);
  } else if (path.basename(tplPath).startsWith('template')) {

    const { valid, ajv } = await validate(tplPath);

    if (!valid) {
      console.error(JSON.stringify(ajv.errors, null, 2));
      process.exit(-1);
    }

    const tpl = await getTpl(tplPath);

    const debugPort = getDebugPort(options);

    const debugIde = getDebugIde(options);

    const httpTriggers = findHttpTriggersInTpl(tpl);

    // todo: list all registered triggers and apis

    registerHttpTriggers(app, httpTriggers, debugPort, debugIde);

    const functions = findFunctionsInTpl(tpl);

    registerApis(app, functions, debugPort, debugIde);

    app.listen(serverPort, function () {
      console.log(`Example app listening on port ${serverPort}!`);
    });
  } else {
    console.error(red('The template file name must be template.[yml|yaml].'));
    process.exit(-1);
  }
}

module.exports = start;
