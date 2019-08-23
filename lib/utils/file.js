'use strict';

const fs = require('fs-extra');
const readline = require('readline');
const getStdin = require('get-stdin');

const { red } = require('colors');

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

  return new Promise((resolve, reject) => {

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


module.exports = { readLines, getEvent };