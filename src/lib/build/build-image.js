const { execSync } = require('child_process');
const { yellow } = require('colors');
const path = require('path');
const fs = require('fs-extra');


async function dockerBuildAndPush(dockerfileUri, image, baseDir, functionName, serviceName) {
  if (!image) {
    console.log(yellow(`The mirror under '${serviceName}/${functionName}' is empty.`));
    return;
  }

  let dockerfile = path.join(baseDir, dockerfileUri || '');
  if (!await fs.exists(dockerfile)) {
    throw new Error(`File ${dockerfile} not found.`);
  }
  const stat = await fs.stat(dockerfile);
  if (stat.isDirectory()) {
    dockerfile = path.join(dockerfile, 'Dockerfile');
    if (!await fs.exists(dockerfile)) {
      throw new Error(`File ${dockerfile} not found.`);
    }
  }

  if (!await fs.exists(dockerfile)) {
    throw new Error(`File ${dockerfile} not found.`);
  }

  execSync(`docker build -t ${image} -f ${dockerfile} .`, {
    stdio: 'inherit'
  });
}

module.exports = {
  dockerBuildAndPush
};
