
'use strict';

var fontList = require('font-list')

module.exports.handler = async function (request, response, context) {
    response.setStatusCode(200);
    response.setHeader('content-type', 'application/json');
    response.send(JSON.stringify(await fontList.getFonts(), null, 4));
};