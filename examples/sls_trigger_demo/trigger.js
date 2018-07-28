'use strict';

exports.handler = function(event, context, callback) {

  console.log("triggerd by sls trigger...");
  callback(null, "trigged...");
};