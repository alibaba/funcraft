'use strict';

module.exports.handler = function (request, response, context) {

  const functionName = context.function.name;

  response.setStatusCode(200);
  response.setHeader('content-type', 'application/json');
  response.send(functionName.slice(3));
};