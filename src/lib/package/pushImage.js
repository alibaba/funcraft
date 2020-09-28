const _ = require('lodash');
const { execSync } = require('child_process');

async function getpushRegistry(image, pushRegistry, region, configImage) {
  const imageArr = image.split('/');
  if (pushRegistry === 'acr-internet') {
    imageArr[0] = `registry.${region}.aliyuncs.com`;
    image = imageArr.join('/');
  } else if (pushRegistry === 'acr-vpc') {
    imageArr[0] = `registry-vpc.${region}.aliyuncs.com`;
    image = imageArr.join('/');
  } else if (pushRegistry) {
    imageArr[0] = pushRegistry;
    image = imageArr.join('/');
  }
  console.log(`docker tag ${configImage} ${image}`);
  execSync(`docker tag ${configImage} ${image}`, {
    stdio: 'inherit'
  });
  console.log(`docker push ${image}`);
  execSync(`docker push ${image}`, {
    stdio: 'inherit'
  });
}

async function getFunctionImage({ tpl, pushRegistry, region }) {
  for (const k of _.keys(tpl)) {
    const v = tpl[k];
    if (_.isObject(v)) {
      if (v.Type === 'Aliyun::Serverless::Function') {
        const { CustomContainerConfig = {} } = v.Properties || {};
        let image = CustomContainerConfig.Image;
        if (image) {
          await getpushRegistry(image, pushRegistry, region, CustomContainerConfig.Image);
        }
      } else {
        await getFunctionImage({ tpl: v, pushRegistry, region });
      }
    }
  }
}

module.exports = {
  getFunctionImage, getpushRegistry
};