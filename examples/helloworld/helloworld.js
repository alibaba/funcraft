'use strict';

const run = require('fc-helper');

exports.index = run((req, res) => {
  res.send('Hello world!\n');
});
