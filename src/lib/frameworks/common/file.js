'use strcit';

const debug = require('debug')('fun:deploy');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { yellow, red, green } = require('colors');
const { promptForConfirmContinue } = require('../../init/prompt');
const { isFcConsoleApplication, writePortFileForFcConsoleApplication } = require('./console');

async function findMainFile(codeDir, fileSuffix, mainRegex) {
  const regex = new RegExp(mainRegex, 'm');

  const files = await fs.readdir(codeDir);
  for (const file of files) {
    if (!_.endsWith(file, fileSuffix)) { continue; }
    const contents = await fs.readFile(path.join(codeDir, file), 'utf8');
    if (regex.test(contents)) {
      debug('mainFile is ', file);

      return path.join(codeDir, file);
    }
  }

  return null;
}

async function detectAndReplaceMainFileAddr(codeDir, mainFile, addrProcessores) {
  const mainFileContents = await fs.readFile(mainFile, 'utf8');

  for (const addrProcessor of addrProcessores) {
    const addrRegex = addrProcessor.regex;
    const replacer = addrProcessor.replacer;

    if (addrRegex.test(mainFileContents)) {
      if (isFcConsoleApplication()) {
        await writePortFileForFcConsoleApplication(codeDir);

        return;
      }

      console.log(`${yellow('Fun detected')} your application doesn't listen on '${yellow('0.0.0.0:9000')}' in ${yellow(mainFile)}`);
      console.log(`Fun will replace your addr to '${yellow('0.0.0.0:9000')}', and also backup your origin file ${yellow(mainFile)} to ${yellow(mainFile + '.bak')}`);

      if (!await promptForConfirmContinue(yellow(`Are your sure?`))) {
        console.warn(red(`Fun will not modify your application listen addr, but if you want deploy to fc, you must listen on '0.0.0.0:9000'`));
        return;
      }

      const replacedContent = mainFileContents.replace(addrRegex, (match, p1) => {
        if (_.isFunction(replacer)) {
          return replacer(match, p1);
        }
        return replacer;
      });

      await fs.copyFile(mainFile, mainFile + '.bak');
      await fs.writeFile(mainFile, replacedContent);

      return;
    }
  }
}

async function detectAndReplaceAddr({
  codeDir,
  mainFileSuffix,
  mainFileRegex,
  addrProcessores
}) {
  const mainFile = await findMainFile(codeDir, mainFileSuffix, mainFileRegex);
  if (!mainFile) {
    return { mainFile: null };
  }

  await detectAndReplaceMainFileAddr(codeDir, mainFile, addrProcessores);

  return { mainFile };
}

async function generateFile(p, backup, mode, content) {
  console.log(green('Generating ' + p + '...'));

  if (await fs.pathExists(p)) {
    if (_.isNil(backup) || backup) {
      console.warn(red(`File ${p} already exists, Fun will rename to ${p}.bak`));

      await fs.copyFile(p, `${p}.bak`, {
        overwrite: true
      });
    }
  }

  await fs.writeFile(p, content, {
    mode
  });
}

async function listDir(codeDir, regex) {
  const rs = [];

  const files = await fs.readdir(codeDir);

  for (const file of files) {
    if (regex.test(file)) {
      rs.push(path.join(codeDir, file));
    }
  }
  
  return rs;
}

function detectElfBinary(binaryPath) {
  const MAGIC = 0x7f454c46; // 0x7f'E''L''F'

  return new Promise((resolve, reject) => {

    fs.open(binaryPath, 'r', (err, fd) => {
      if (err) { 
        reject(err);
        return;
      }

      function done(err, rs) {
        fs.close(fd, function (cerr) {
          if (err) {
            reject(err);
          } else {
            resolve(rs);
          }
        });
      }

      const ident = Buffer.alloc(16);
      fs.read(fd, ident, 0, 16, null, function (err, bytesRead) {
        if (err) { return done(err); }

        const magic = ident.readUInt32BE(0);

        if (MAGIC !== magic) { return done(null, false); }
        return done(null, true);
      });
    });
  });
}

module.exports = {
  detectAndReplaceAddr, generateFile, detectElfBinary, listDir
};