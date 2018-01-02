'use strict';

const hook = require('fc-helper');

exports.index = hook((req, res) => {
  res.send('Hello world!\n');
});
