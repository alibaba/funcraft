'use strict';

exports.config = {
  token: '<YOUR TOKEN>',
  encodingAESkey: '<YOUR ENCODING AES KEY>',
  appid: '<YOUR APP ID>'
};

exports.handle = async function (message) {
  return JSON.stringify(message);
  // return 'Just hello world!';
};
