const { execSync } = require('child_process');
const { yellow } = require('colors');
const path = require('path');
const fs = require('fs');


async function dockerBuildAndPush(dockerfileUri, image, baseDir, functionName, serviceName) {
  if (!image) {
    console.log(yellow(`The mirror under '${serviceName/functionName}' is empty.`));
    return;
  }

  let dockerfile = path.join(baseDir, dockerfileUri || '');
  if (!fs.existsSync(dockerfile)) {
    throw new Error(`File ${dockerfile} not found.`);
  }
  const stat = fs.statSync(dockerfile);
  if (stat.isDirectory()) {
    dockerfile = path.join(baseDir, dockerfileUri || '', 'Dockerfile');
    if (!fs.existsSync(dockerfile)) {
      throw new Error(`File ${dockerfile} not found.`);
    }
  }

  if (!fs.existsSync(dockerfile)) {
    throw new Error(`File ${dockerfile} not found.`);
  }
  
  await execSync(`docker build -t ${image} -f ${dockerfile} .`, {
    stdio: 'inherit'
  });
}

module.exports = {
  dockerBuildAndPush
}
