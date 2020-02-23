'use strict';

const httpx = require('httpx');
const cheerio = require('cheerio');
const detectMocha = require('detect-mocha');

const { red } = require('colors');
const { Transform } = require('stream');
const { unrefTimeout } = require('./unref-timeout');

const _ = require('lodash');

class FilterChain {
  constructor(options = {}) {
    this.processors = [
      new PuppeteerInvalidPlatformProcessor(options),
      new DynamicLinkLibraryMissingProcessor(options),
      new NoSpaceLeftOnDeviceProcessor(options),
      new MissingAptGetProcessor(options),
      new DockerNotStartedOrInstalledErrorProcessor(options),
      new FcServiceNotEnabledProcessor(options),
      new RamInactiveErrorProcessor(options),
      new RosStackValidationErrorProcessor(options),
      new LogInactiveErrorProcessor(options),
      new ClientTimeoutErrorProcessor(options)
    ];
  }

  async process(message, err) {
    for (const processor of this.processors) {
      if (!message) { message = ''; }

      if (processor.match(message, err)) {
        await processor.process(message, err);
        await processor.postProcess();
        return true;
      }
    }
  }
}

class ErrorProcessor {
  constructor(options = {}) {
    this.serviceName = options.serviceName;
    this.functionName = options.functionName;
  }

  match(message, err) { }
  async process(message, err) { }

  _autoExist() {
    process.nextTick(() => {
      console.log(red('\nFun will auto exit after 3 seconds.\n'));

      if (!detectMocha()) {
        unrefTimeout(() => {
          process.emit('SIGINT');
        }, 3000);
      }
    });
  }

  async postProcess() {
    console.log();
  }
}

class ClientTimeoutErrorProcessor extends ErrorProcessor {
  match(message, err) {
    return _.includes(message, 'ReadTimeout(');
  }

  async process(message) {
    console.log(red(`The timeout of API request has been detected，you can increase timeout value by 'fun config'.`));
  }
}

class DockerNotStartedOrInstalledErrorProcessor extends ErrorProcessor {
  match(message, err) {
    if (_.includes(message, 'connect ECONNREFUSED /var/run/docker.sock')
      || _.includes(message, 'Error: connect ENOENT //./pipe/docker_engine')) {
      return true;
    }

    return false;
  }

  async process(message) {
    console.log(red('Fun detected that Docker is not installed on your host or not started. Please run \'docker ps\' command to check docker status.'));
  }
}

class FcServiceNotEnabledProcessor extends ErrorProcessor {
  match(message, err) {
    if (_.includes(message, 'FC service is not enabled for current user')) {
      return true;
    }

    return false;
  }

  async process(message) {
    console.log(red('FC service is not enabled for current user. Please enable FC service before using fun.\nYou can enable FC service on this page https://www.aliyun.com/product/fc .'));
  }
}

class RamInactiveErrorProcessor extends ErrorProcessor {
  match(message, err) {
    return (_.includes(message, 'Account is inactive to this service') && _.includes(message, 'ram.aliyuncs.com'));
  }

  async process(message) {
    console.log(red('Ram service is not enabled for current user. Please enable Ram service before using fun.\nYou can enable Ram service on this page https://www.aliyun.com/product/ram .'));
  }
}


class RosStackValidationErrorProcessor extends ErrorProcessor {
  match(message, err) {
    return _.includes(message, 'Function CodeUri must be an oss bucket, try using package');
  }

  async process(message) {
    console.log(red('StackValidationFailed: template syntax mismatch with ROS support. You may be able to solve it by executing the command \'fun package\'.'));
  }
}

class LogInactiveErrorProcessor extends ErrorProcessor {
  match(message, err) {
    return err && err.code === 'InvalidAccessKeyId' && _.includes(message, 'AccessKeyId') && _.includes(message, 'is inactive');
  }

  async process(message) {
    console.log(red('\nPlease go to https://sls.console.aliyun.com/ to open the LogServce.'));
  }
}

// 发生在 fun install 安装依赖，但是依赖包含解决方案，比如 puppeteer，需要使用 apt-get 安装，如果宿主机没有，那就提示使用 fun install -d
class MissingAptGetProcessor extends ErrorProcessor {
  match(message) {
    return _.includes(message, 'touch: /var/cache/apt/pkgcache.bin: No such file or directory');
  }

  async process(message) {
    process.nextTick(() => {
      console.log(red(`Tips: Fun has detected that there is no apt-get installed on the machine, you need use 'fun install --use-docker' to reinstall.
Type 'fun install -h' for more help.`));
    });
  }
}

class NoSpaceLeftOnDeviceProcessor extends ErrorProcessor {
  match(message) {
    return _.includes(message, 'no space left on device');
  }

  async process(message) {
    process.nextTick(() => {
      console.log(red(`Tips: Fun has detected that docker is no space left. 
if You are using Docker for Windows/Mac, you can select the Docker icon and then Preferences > Resources > Advanced and increase docker image size.
Please refer to https://docs.docker.com/docker-for-mac/space/ for more help.
`));
    });
  }
}

class DynamicLinkLibraryMissingProcessor extends ErrorProcessor {

  constructor(options) {
    super(options);

    this.prefix = 'error while loading shared libraries: ';
    this.suffix = ': cannot open shared object file: No such file or directory';
    this.debianPakcageUrlPrefix = 'https://packages.debian.org/search?lang=en&suite=jessie&arch=amd64&mode=path&searchon=contents&keywords=';
    this.libPrefixWhiteList = ['/usr/lib/x86_64-linux-gnu', '/lib/x86_64-linux-gnu', '/usr/local/lib'];
  }

  match(message) {
    return _.includes(message, this.prefix)
      && _.includes(message, this.suffix);
  }

  async _findPackageByDlName(lib) {
    const response = await httpx.request(`${this.debianPakcageUrlPrefix}${lib}`, { timeout: 10000 });

    const body = await httpx.read(response, 'utf8');

    const $ = cheerio.load(body);

    const packagesTable = $('#pcontentsres table tbody tr').map((i, element) => ({
      path: $(element).find('td:nth-of-type(1)').text().trim(),
      name: $(element).find('td:nth-of-type(2)').text().trim()
    })).get();

    const packageInfo = _.find(packagesTable, info => _.some(this.libPrefixWhiteList, (prefix) => info.path.startsWith(prefix)));

    if (packageInfo) {
      return packageInfo.name;
    }

    return null;
  }

  async _fetchDlName(message) {
    // error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory

    const prefixIdx = message.indexOf(this.prefix);
    const suffixIdx = message.indexOf(this.suffix);

    return message.substring(prefixIdx + this.prefix.length, suffixIdx);
  }

  async process(message) {
    const lib = await this._fetchDlName(message);

    const packageName = await this._findPackageByDlName(lib);

    if (packageName) {
      process.nextTick(() => {
        console.log(red(`Tips: Fun has detected that you are missing ${lib} library, you can try to install it like this:

  step1: fun install sbox -f ${this.serviceName}/${this.functionName} -i
  step2: fun-install apt-get install ${packageName}
  step3: type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command:

  fun install sbox -f ${this.serviceName}/${this.functionName} --cmd 'fun-install apt-get install ${packageName}'
`));
      });
    } else {
      console.log(red(`Tips: Fun has detected that you are missing ${lib} library, you can try to install it like this:

  step1: open this page ${this.debianPakcageUrlPrefix}${lib} to find your missing dependency
  step2: fun install sbox -f ${this.serviceName}/${this.functionName} -i
  step3: fun-install apt-get install YourPackageName
  step4: type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command:

  fun install sbox -f ${this.serviceName}/${this.functionName} --cmd 'fun-install apt-get install YourPackageName'
`));
    }

    this._autoExist();
  }
}

class PuppeteerInvalidPlatformProcessor extends ErrorProcessor {
  match(message) {
    return _.includes(message, 'Error: Chromium revision is not downloaded. Run "npm install" or "yarn install"');
  }

  async process(message) {
    process.nextTick(() => {
      console.log(red(`Tips: Fun has detected that your puppeteer installation platform is incorrect. 
Please reinstall it like this:

1. fun install sbox -f ${this.serviceName}/${this.functionName} -i
2. fun-install npm install puppeteer
3. type 'exit' to exit container and then reRun your function

Also you can install puppeteer through one command: 
fun install sbox -f puppeteer/html2png --cmd 'fun-install npm install puppeteer'`));

      this._autoExist();
    });
  }
}

class ChunkSplitTransform extends Transform {
  constructor(options) {
    super(options);
    this._buffer = '';
    this._separator = options.separator || '\n';
  }

  _transform(chunk, encoding, done) {
    let sepPos;
    this._buffer += chunk.toString();

    while ((sepPos = this._buffer.indexOf(this._separator)) !== -1) {
      const portion = this._buffer.substr(0, sepPos);
      this.push(portion + this._separator);
      this._buffer = this._buffer.substr(sepPos + this._separator.length);
    }

    done();
  }

  _flush(done) {
    this.push(this._buffer);
    done();
  }
}

class FcErrorTransform extends Transform {
  constructor(options) {
    super(options);
    this.filterChain = new FilterChain(options);
  }
  _transform(chunk, encoding, done) {
    const message = chunk.toString();
    this.filterChain.process(message).then(() => {
      this.push(message);
      done();
    });
  }
}

function processorTransformFactory({
  serviceName,
  functionName,
  errorStream
}) {
  const transform = new ChunkSplitTransform({
    separator: '\n'
  });

  transform.pipe(new FcErrorTransform({
    serviceName: serviceName,
    functionName: functionName
  })).pipe(errorStream);

  return transform;
}

module.exports = {
  processorTransformFactory,
  FilterChain
};
