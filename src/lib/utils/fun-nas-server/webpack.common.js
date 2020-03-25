'use strict';
const path = require('path');

module.exports = {
  entry: './index.js',
  node: {
    __dirname: false
  },
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd'
  }
};