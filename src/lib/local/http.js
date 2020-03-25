'use strict';

const getRawBody = require('raw-body');
const getProfile = require('../profile').getProfile;
const FC = require('@alicloud/fc2');

const debug = require('debug')('fun:local');
const { parseHeaders, parseStatusLine } = require('http-string-parser');

// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
/* eslint-disable */
const headerFieldRe = new RegExp('^[\x00-\x7F]+$');
/* eslint-enable */

function normalizeRawHeaders(rawHeaders) {
  const normalizedHeaders = {};

  if (rawHeaders && Array.isArray(rawHeaders)) {

    for (let i = 0; i < rawHeaders.length; i += 2) {
      const key = rawHeaders[i];
      const value = rawHeaders[i + 1];

      const values = normalizedHeaders[key];
      if (values) {
        values.push(value);
      } else {
        normalizedHeaders[key] = [value];
      }
    }
  }

  return normalizedHeaders;
}

// { key1: value1, key2: [value2, value3] } to { key1: [value1], key2: [value2, value3] }
function normalizeMultiValues(maps) {

  if (maps) {
    return Object.entries(maps)
      .reduce((acc, [key, val]) =>
        Object.assign(acc, { [key]: Array.isArray(val) ? val : [val] }), 
      {});
  }

  return {};
}

function generateHttpParams(req, pathPrefix) {
  const requestURI = req.originalUrl;
  const method = req.method;
  const path = req.path.substring(pathPrefix.length);
  const clientIP = req.ip;
  const host = req.hostname;

  // for nodejs and python and php
  // http://nodejs.cn/api/http.html#http_message_rawheaders
  const headersMap = normalizeRawHeaders(req.rawHeaders);

  const queriesMap = normalizeMultiValues(req.query);

  const params = {
    requestURI,
    method,
    path,
    clientIP,
    queriesMap,
    headersMap,
    host
  };

  const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');

  return encodedParams;
}

async function getHttpRawBody(req) {
  // will return buffer when encoding not specified for raw-body
  const event = await getRawBody(req, {
    length: req.headers['content-length']
  });

  return event;
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

function parseHttpTriggerHeaders(base64Headers) {
  let headers = {};

  if (base64Headers) {
    const rawHeaders = Buffer.from(base64Headers, 'base64').toString();
    headers = JSON.parse(rawHeaders);
  }

  return headers;
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

// copied from http-string-parser library
// only change: 
// use \r\n instead of \r?\n in responseString.split
// see https://stackoverflow.com/a/27966412/6602338
// see http.test.js "test image response"
function parseResponse(responseString) {
  var headerLines, line, lines, parsedStatusLine, response;
  response = {};
  lines = responseString.split(/\r\n/);

  parsedStatusLine = parseStatusLine(lines.shift());
  response['protocolVersion'] = parsedStatusLine['protocol'];
  response['statusCode'] = parsedStatusLine['statusCode'];
  response['statusMessage'] = parsedStatusLine['statusMessage'];
  headerLines = [];
  while (lines.length > 0) {
    line = lines.shift();
    if (line === '') {
      break;
    }
    headerLines.push(line);
  }
  response['headers'] = parseHeaders(headerLines);
  response['body'] = lines.join('\r\n');
  return response;
}

function parseOutputStream(outputStream) {
  // 这里的 outputStream 包含 mock.sh 原始内容，以及 base64 后的 curl 的 response，因此可以直接按照 utf8 toString
  const response = outputStream.toString().split('\n');

  const [functionResponse, executionRawInfo] = filterFunctionResponseAndExecutionInfo(response);

  const functionBase64Response = functionResponse.join('\n');

  // 这里将 curl 的 response 按照 base64 解码，得到元数据
  // 然后通过使用 binary 将 body 中的二进制数据编码，后面 parser 内部会调用 toString，转换成 binary 后，可以安全地进行 parse 了。
  const rawResponse = Buffer.from(functionBase64Response, 'base64').toString('binary');

  const parsedResponse = parseResponse(rawResponse);

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

module.exports = {
  generateHttpParams, getHttpRawBody,
  validateSignature, parseOutputStream,
  parseHttpTriggerHeaders, validateHeader, filterFunctionResponseAndExecutionInfo,
  normalizeMultiValues, normalizeRawHeaders,
  parseResponse
};