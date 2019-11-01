'use strict';

const _ = require('lodash');

const HeaderDate = 'Date';

const RequestID = 'X-Fc-Request-Id';

const CORSMaxAgeSeconds = '3600';

// InvocationError header key for invocation error type header
const InvocationError = 'x-fc-error-type';

// InvocationLogResult header key for log result of the invocation
const InvocationLogResult = 'x-fc-log-result';

// MaxMemoryUsage defines the usage of fc invocation
const MaxMemoryUsage = 'x-fc-max-memory-usage';

// InvocationDuration defines the duration of fc invocation
const InvocationDuration = 'x-fc-invocation-duration';
// InvocationCodeChecksum header key for code checksum of the invocation

const InvocationCodeChecksum = 'x-fc-code-checksum';
// InvocationCodeVersion header key for code version of the invocation
const InvocationCodeVersion = 'x-fc-invocation-code-version';

const exposedHeaders = [HeaderDate, RequestID, InvocationError, InvocationCodeChecksum, InvocationDuration, MaxMemoryUsage, InvocationLogResult, InvocationCodeVersion];

const CORSExposedHeaders = _.join(exposedHeaders, ',');


function setCORSHeaders(req, res, next) {
  let oneof = false;
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    oneof = true;
  }
  if (req.headers['Access-control-request-method']) {
    res.header('Access-Control-Allow-Methods', req.headers['Access-control-request-method']);
    oneof = true;
  }
  if (req.headers['Access-control-request-headers']) {
    res.header('Access-Control-Allow-Headers', req.headers['Access-control-request-headers']);
    oneof = true;
  }
  if (oneof) {
    res.header('Access-Control-Max-Age', CORSMaxAgeSeconds);
  }

  res.header('Access-Control-Expose-Headers', CORSExposedHeaders);
  // intercept OPTIONS method
  if (oneof && req.method === 'OPTIONS') {
    res.send(200);
  }
  else {
    return next();
  }
}

module.exports = { setCORSHeaders };
