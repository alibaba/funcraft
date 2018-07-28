'use strict';

exports.handler = function(event, context, callback) {
  var response = {
    isBase64Encoded:false,
    statusCode: 200,
    headers: {
      "x-custom-header" : "header value"
    },
    body: "hellowrold"
  };

  console.log("response: " + JSON.stringify(response));
  callback(null, response);
};