'use strict';

const OSS = require('ali-oss');
const fs = require('fs');
const exec = require('child_process').exec;

const getOssClient = async (bucket, context) => {
  console.log('stsToken: context.credentials.securityToken', context.credentials.securityToken);

  return OSS({
    accessKeyId: context.credentials.accessKeyId,
    accessKeySecret: context.credentials.accessKeySecret,
    stsToken: context.credentials.securityToken,
    internal: true,
    // internal: false, // todo:
    bucket,
    region: 'oss-' + context.region
  });
};


function downloadFromOSSAndExtractToNas(bucket, objectName, dst, context) {

  return getOssClient(bucket, context).then(client => {
    return client.getStream(objectName);
  }).then(result => {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
    }
    return new Promise((resolve, reject) => {
      result.stream.pipe(fs.createWriteStream('/tmp/nas.zip'))
        .on('error', err => {
          reject(err);
        }).on('finish', resolve);
    });
  }).then(() => {
    return new Promise((resolve, reject) => {
      exec(`unzip -q -n /tmp/nas.zip -d ${dst}`, {
        encoding: 'utf8',
        timeout: 0,
        maxBuffer: 1024 * 1024 * 1024,
        killSignal: 'SIGTERM'
      }, (error, stdout, stderr) => {
        if (error) { reject(error); }
        resolve({
          stdout,
          stderr
        });
      });
    });
  });
}

// 辅助函数，这个辅助函数用于实现从 oss 上下载 nas.zip 以及解压到 nas 的功能。
module.exports.handler = (event, context, callback) => {
  const eventJson = JSON.parse(event);

  const objectNames = eventJson.objectNames;
  const dst = eventJson.dst;
  const bucket = eventJson.bucket;

  const promises = [];

  for (const objectName of objectNames) {
    const result = downloadFromOSSAndExtractToNas(bucket, objectName, dst, context);
    promises.push(result);
  }

  Promise.all(promises).then(() => callback(null, 'success')).catch(callback);
};