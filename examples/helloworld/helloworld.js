'use strict';

const { hook } = require('fc-helper');

exports.index = hook(async (ctx) => {
  ctx.body = 'Hello Function Compute & API Gateway!';
});
