'use strict';

const request = require('request');




async function sendLsReq(fcUrl, nasPath, allFlag, listFlag) {
  return new Promise((resolve, reject) => {
    var options = {
      headers: { 'Connection': 'close' },
      url: `${fcUrl}list?nasPath=${nasPath}&allFlag=${allFlag}&listFlag=${listFlag}`,
      method: 'GET'
    };
    
    function callback(error, response, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }
    
    request(options, callback);
  });
}
async function ls(nasPath, allFlag, listFlag, serviceName) {
  var fcUrl = await require('../cp/nasConfig').getFcNasUrl(serviceName);
  
  var listContent = await sendLsReq(fcUrl, nasPath, allFlag, listFlag);

  console.log(listContent);
}

module.exports = { ls };