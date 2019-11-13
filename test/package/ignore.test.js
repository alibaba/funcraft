'use strict';

const path = require('path'),
  expect = require('expect.js'),
  ignore = require('../../lib/package/ignore');

const fs = require('fs-extra');

describe('funignore', async () => {

  it('default ignore', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(path.join(__dirname, '.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.svn'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.git'))).to.be.ok();

    expect(funignore(path.join(__dirname, '/abc/.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '/abc/ddd/.env'))).to.be.ok();

  });

  it('from .funignore', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(path.join(__dirname, '1.log'))).to.be.ok();
    expect(funignore(path.join(__dirname, '1.log1'))).not.to.be.ok();
    expect(funignore(path.join(__dirname, 'node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'aa/node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'bb/node_modules'))).not.to.be.ok();

  });

  it('empty path', async () => {
    var funignore = await ignore(__dirname);

    expect(funignore(__dirname)).not.to.be.ok();
  });

  it('unignore env', async () => {
    var baseDir = path.join(__dirname, 'unignore');
    var funignore = await ignore(baseDir);

    expect(funignore(path.join(baseDir, '.env'))).not.to.be.ok();
  });

  it('test nasMappings.json', async () => {
    const baseDir = process.cwd();
    const nasMappingsPath = path.resolve(baseDir, '.fun', 'nasMappings.json');

    await fs.ensureFile(nasMappingsPath);

    const content = {
      'MyService': [
        {
          'localNasDir': '/Users/ellison/fun/.fun/root',
          'remoteNasDir': '/mnt/auto/root'
        },
        {
          'localNasDir': '/Users/ellison/fun/node_modules',
          'remoteNasDir': '/mnt/auto/node_modules'
        }
      ]
    };

    await fs.outputFile(nasMappingsPath, JSON.stringify(content, null, 4));

    var funignore = await ignore(baseDir);

    expect(funignore(path.join(baseDir, 'fun', 'nasMappings.json'))).to.be.ok();
    expect(funignore(path.join(baseDir, 'fun', '1.log'))).not.to.be.ok();
    expect(funignore(path.join(baseDir, 'node_modules'))).to.be.ok();
    expect(funignore(path.join(baseDir, '.fun/root'))).to.be.ok();

    await fs.remove(nasMappingsPath);
  });
});