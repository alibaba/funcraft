
'use strict';

var getRawBody = require('raw-body')
var fontList = require('font-list')

module.exports.handler = async function (request, response, context) {
  // get request body
  getRawBody(request, async function (err, body) {
    var respBody = {
        headers: request.headers,
        url: request.url,
        path: request.path,
        queries: request.queries,
        method: request.method,
        clientIP: request.clientIP,
        body: body.toString(),
        fonts: await fontList.getFonts()
    };

    response.setStatusCode(200);
    response.setHeader('content-type', 'application/json');
    response.send(JSON.stringify(respBody, null, 4));
  });
};