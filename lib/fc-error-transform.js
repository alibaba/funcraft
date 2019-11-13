'use strict';

const httpx = require('httpx');
const cheerio = require('cheerio');
const _ = require('lodash');
const { red } = require('colors');
const { Transform } = require('stream');
const unrefTimeout = require('../lib/unref-timeout');
const detectMocha = require('detect-mocha');

class FilterChain {
  constructor(...processors) {
    this.processors = processors || [];
  }

  async process(message) {
    for (const processor of this.processors) {
      if (processor.match(message)) {
        await processor.process(message);
        await processor.postProcess();
        return;
      }
    }
  }
}

class ErrorProcessor {
  constructor(options = {}) {
    this.serviceName = options.serviceName;
    this.functionName = options.functionName;
  }

  match(message) { }
  async process(message) { }
  async postProcess() {
    console.log(red('\nFun will auto exit after 3 seconds.\n'));
    
    if (!detectMocha()) {
      unrefTimeout(() => {
        process.emit('SIGINT');
      }, 3000);
    }
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
  
  1. fun install sbox -f ${this.serviceName}/${this.functionName} -i
  2. fun-install apt-get install ${packageName}
  3. type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command: 
fun install sbox -f puppeteer/html2png --cmd 'fun-install apt-get install ${packageName}'
  
`));
      });
    } else {
      console.log(red(`Tips: Fun has detected that you are missing ${lib} library, you can try to install it like this:
      
1. open this page ${this.debianPakcageUrlPrefix}${lib} to find your missing dependency
2. fun install sbox -f ${this.serviceName}/${this.functionName} -i
3. fun-install apt-get install YourPackageName
4. type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command: 
fun install sbox -f puppeteer/html2png --cmd 'fun-install apt-get install YourPackageName'
`));
    }
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
    this.filterChain = new FilterChain(
      new PuppeteerInvalidPlatformProcessor(options),
      new DynamicLinkLibraryMissingProcessor(options)
    );
  }
  _transform(chunk, encoding, done) {
    const message = chunk.toString();
    this.filterChain.process(message).then(() => {
      this.push(message);
      done();
    });
  }
}

module.exports = function ({
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
};

