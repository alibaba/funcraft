'use strict';

const path = require('path');

var express = require('express');
var app = express();

const getRawBody = require('raw-body');

const httpParser = require('http-string-parser');

const FC = require('@alicloud/fc2');

const { detectTplPath, getTpl } = require('../../tpl');
const validate = require('../../validate/validate');
const debug = require('debug')('fun:local');

const getProfile = require('../../profile').getProfile;

const { findHttpTriggersInTpl } = require('../../definition');

const docker = require('../../docker');
const streams = require('memory-streams');

const { getDebugPort, getDebugIde } = require('../../debug');

const serverPort = 8000;
const FC_HTTP_PARAMS = 'x-fc-http-params';

// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
const headerFieldRe = /^[\x00-\x7F]*$/;

function validHeader(headerKey, headerValue) {
    if (!headerKey.trim() || !headerFieldRe.test(headerKey)) {
        return false;
    }

    if (!headerValue.trim() || !headerFieldRe.test(headerValue)) {
        return false;
    }

    return true;
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
    }

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

function parseHttpTriggerHeaders(base64Headers) {
    let headers = {};

    if (base64Headers) {
        const rawHeaders = Buffer.from(base64Headers, 'base64').toString();
        headers = JSON.parse(rawHeaders);
    }

    return headers;
}

function registerHttpTriggers(httpTriggers, debugPort, debugIde) {
    for (let { serviceName, functionName, functionRes,
        triggerName, triggerRes } of httpTriggers) {

        debug("serviceName: " + serviceName);
        debug("functionName: " + functionName);
        debug("tiggerName: " + triggerName);
        debug("triggerRes: " + triggerRes);

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
                        res.status(500).send(`Signature doesn\'t match, request signature is ${clientSignature}, but server signature is ${signature}`);
                        return
                    }
                }
                
                await docker.invokeFunction(serviceName, functionName, functionRes, debugPort, event, debugIde, httpParams, outputStream, errorStream);

                // todo: 实时处理，而不是最后处理
                const errorResponse = errorStream.toString();
                const rawHttpResponse = parseAndProcessOutput(outputStream);

                if (!errorResponse) {
                    const parsedHttpResponse = httpParser.parseResponse(rawHttpResponse);

                    const base64Headers = parsedHttpResponse.headers[FC_HTTP_PARAMS];

                    const headers = parseHttpTriggerHeaders(base64Headers);

                    const originBody = Buffer.from(parsedHttpResponse.body, 'binary');

                    res.status(headers.status);

                    for (const headerKey in headers.headers) {
                        const headerValue = headers.headers[headerKey];

                        if (validHeader(headerKey, headerValue)) {
                            res.setHeader(headerKey, headerValue);
                        }
                    }
                    res.send(originBody);
                } else {
                    console.log(errorResponse);
                    res.status(500).end("your function occur errors");
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

        registerHttpTriggers(httpTriggers, debugPort, debugIde);

        app.listen(serverPort, function () {
            console.log(`Example app listening on port ${serverPort}!`);
        });
    } else {
        console.error(red('The template file name must be template.[yml|yaml].'));
        process.exit(-1);
    }
}

function filterFunctionResponse(response) {
    let responseBegin = false;

    const httpResponse = [];

    for (let line of response) {
        if (line.startsWith("--------------------response begin-----------------")) {
            responseBegin = true;
            continue
        } else if (line.startsWith("--------------------response end-----------------")) {
            responseBegin = false;
            continue;
        }

        if (responseBegin) {
            httpResponse.push(line);
        } else {
           console.log(line);
        }
    }

    return httpResponse;
}

function parseAndProcessOutput(outputStream) {
    // 这里的 outputStream 包含 mock.sh 原始内容，以及 base64 后的 curl 的 response，因此可以直接按照 utf8 toString
    const response = outputStream.toString().split('\n');

    const functionResponse = filterFunctionResponse(response);

    const functionBase64Response = functionResponse.join('\n');

    // 这里将 curl 的 response 按照 base64 解码，得到元数据
    // 然后通过使用 binary 将 body 中的二进制数据编码，后面可以将 body 按照 string，以便于
    // 以便于可以让 parser 解析为 http response。
    const rawResponse = Buffer.from(functionBase64Response, 'base64').toString('binary');

    return rawResponse;
}

module.exports = start;