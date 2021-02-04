const { getProfile } = require('./profile');
const { getOssClient } = require('./client');
const { promptForConfirmContinue, promptForInputContinue } = require('./init/prompt');
const { yellow } = require('colors');

const _ = require('lodash');


async function bucketExist(ossClient, bucketName) {
  let bucketExist = false;

  try {
    await ossClient.getBucketLocation(bucketName);
    bucketExist = true;
  } catch (ex) {

    if (!ex.code || !_.includes(['AccessDenied', 'NoSuchBucket'], ex.code)) {
      throw ex;
    }
  }
  return bucketExist;
}


async function generateOssBucket(bucketName, assumeYes) {
  const ossClient = await getOssClient();

  if (await bucketExist(ossClient, bucketName)) {
    console.log(yellow(`using oss-bucket: ${bucketName}`));
    return bucketName;
  }

  console.log(yellow(`using oss-bucket: ${bucketName}`));
  
  if (!assumeYes && (process.stdin.isTTY && !await promptForConfirmContinue('Auto generate OSS bucket for you?'))) {
    bucketName = (await promptForInputContinue('Input OSS bucket name:')).input;
  }

  await ossClient.putBucket(bucketName);

  return bucketName;
}

async function processOSSBucket(bucket, assumeYes) {
  if (!bucket) {
    const profile = await getProfile();
    const defalutBucket = `fun-gen-${profile.defaultRegion}-${profile.accountId}`;
    return await generateOssBucket(defalutBucket, assumeYes);
  }
  return await generateOssBucket(bucket, assumeYes);
}

module.exports = {
  processOSSBucket
};