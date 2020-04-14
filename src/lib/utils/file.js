'use strict';

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const getStdin = require('get-stdin');

const { red } = require('colors');
const { DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX } = require('../tpl');

const _ = require('lodash');

const getVisitor = require('../visitor').getVisitor;

function readLines(fileName) {
  return new Promise((resolve, reject) => {
    const lines = [];

    readline.createInterface({input: fs.createReadStream(fileName)})
      .on('line', line => lines.push(line))
      .on('close', () => resolve(lines))
      .on('error', reject);
  });
}

/**
 * Get event content from a file. It reads event from stdin if the file is "-".
 *
 * @param file the file from which to read the event content, or "-" to read from stdin.
 * @returns {Promise<String>}
 */
async function getEvent(eventFile, ec = 'local invoke', dp = '/fun/local/invoke') {
  let event = await getStdin(); // read from pipes

  if (event && eventFile) {
    throw new Error(red('-e or stdin only one can be provided'));
  }

  if (!eventFile) { return event; }

  return await new Promise((resolve, reject) => {

    let input;

    if (eventFile === '-') { // read from stdin
      console.log(`Reading event data from stdin, which can be ended with Enter then Ctrl+D
  (you can also pass it from file with -e)`);
      input = process.stdin;
    } else {
      input = fs.createReadStream(eventFile, {
        encoding: 'utf-8'
      });
    }
    const rl = readline.createInterface({
      input,
      output: process.stdout
    });

    event = '';
    rl.on('line', (line) => {
      event += line;
    });
    rl.on('close', () => {
      console.log();
      getVisitor().then(visitor => {
        visitor.event({
          ec,
          ea: 'getEvent',
          el: 'success',
          dp
        }).send();

        resolve(event);
      });
    });

    rl.on('SIGINT', function () {

      getVisitor().then(visitor => {
        visitor.event({
          ec,
          ea: 'getEvent',
          el: 'cancel',
          dp
        }).send();
        // Keep the behavior consistent with system.
        reject(new Error('^C'));
      });
    });
  });
}

function isEventString(options) {
  return options.event && !fs.pathExistsSync(options.event);
}

async function eventPriority(options) {
  if (isEventString(options)) { return options.event; }

  let eventFile;

  if (options.eventStdin) {
    eventFile = '-';
  } else if (options.eventFile) {
    eventFile = path.resolve(process.cwd(), options.eventFile);
  } else if (options.event && fs.pathExistsSync(options.event)) {
    console.warn(red(`Warning: Using -e to specify the event file path will be replaced by -f in the future.`));
    eventFile = path.resolve(process.cwd(), options.event);
  }

  return await getEvent(eventFile);
}

async function recordMtimes(filePaths, buildOps, recordedPath) {

  const fileMtimes = await filePaths.reduce(async (accPromise, cur) => {
    if (!await fs.pathExists(cur)) {
      throw new Error(`${cur} is not exsit`);
    }

    const collection = await accPromise;
    const lstat = await fs.lstat(cur);

    const modifiedTimeObj = collection.modifiedTimestamps || {};

    Object.assign(collection, {
      'modifiedTimestamps': Object.assign(modifiedTimeObj, {
        [cur]: lstat.mtime.getTime().toString()
      })
    });

    return collection;
  }, Promise.resolve({}));

  // save build options
  fileMtimes.buildOps = buildOps;

  await fs.outputFile(recordedPath, JSON.stringify(fileMtimes, null, 4));
}

async function readJsonFromFile(absFilePath) {
  let obj;

  const str = await fs.readFile(absFilePath, 'utf8');
  try {

    obj = JSON.parse(str);
  } catch (err) {
    throw new Error(`Unable to parse json file: ${absFilePath}.\nError: ${err}`);
  }
  return obj;
}

function getMetaPath(artifactsTplPath) {
  if (artifactsTplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) { return null; }
  return path.resolve(path.dirname(artifactsTplPath), 'meta.json');
}

async function updateTimestamps(tplPath, files) {
  const metaPath = getMetaPath(tplPath);
  if (!await fs.pathExists(metaPath)) { return; }

  const metaObj = await readJsonFromFile(metaPath);

  if (_.isEmpty(metaObj)) { return; }

  const modifiedTimeObj = metaObj.modifiedTimestamps || {};

  for (const file of files) {
    if (modifiedTimeObj[file]) {
      const lstat = fs.lstatSync(file);
      modifiedTimeObj[file] = lstat.mtime.getTime().toString();
    }
  }

  await fs.outputFile(metaPath, JSON.stringify(metaObj, null, 4));
}

async function getModifiedTimestamps(tplPath) {
  if (tplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) { return {}; }

  const metaPath = path.resolve(path.dirname(tplPath), 'meta.json');

  if (!await fs.pathExists(metaPath)) { return {}; }

  const metaObj = await readJsonFromFile(metaPath);

  if (_.isEmpty(metaObj)) { return {}; }

  return _.pickBy((metaObj.modifiedTimestamps || {}), (mtime, filePath) => {
    const lstat = fs.lstatSync(filePath);
    return mtime !== lstat.mtime.getTime().toString();
  });
}

async function ensureFilesModified(tplPath) {
  const modifiedTimes = await getModifiedTimestamps(tplPath);

  if (!_.isEmpty(modifiedTimes)) {
    throw new Error(`
        ${Object.keys(modifiedTimes).join('\n\t')}\n` +
`
Fun detected the above path have been modified. Please execute ‘fun build’ to compile your functions.`);
  }
}

module.exports = {
  readLines, getEvent, recordMtimes, eventPriority,
  readJsonFromFile, ensureFilesModified, updateTimestamps
};