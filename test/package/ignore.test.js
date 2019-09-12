'use strict';

const path = require('path'), 
  expect = require('expect.js'),
  ignore = require('../../lib/package/ignore');

describe('funignore', () => {

  it('default ignore', () => {
    var funignore = ignore(__dirname);
    
    expect(funignore(path.join(__dirname, '.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.svn'))).to.be.ok();
    expect(funignore(path.join(__dirname, '.git'))).to.be.ok();

    expect(funignore(path.join(__dirname, '/abc/.env'))).to.be.ok();
    expect(funignore(path.join(__dirname, '/abc/ddd/.env'))).to.be.ok();

  });

  it('from .funignore', () => {
    var funignore = ignore(__dirname);

    expect(funignore(path.join(__dirname, '1.log'))).to.be.ok();
    expect(funignore(path.join(__dirname, '1.log1'))).not.to.be.ok();
    expect(funignore(path.join(__dirname, 'node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'aa/node_modules'))).to.be.ok();
    expect(funignore(path.join(__dirname, 'bb/node_modules'))).not.to.be.ok();

  });

  it('empty path', () => {
    var funignore = ignore(__dirname);

    expect(funignore(__dirname)).not.to.be.ok();
  });

  it('unignore env', () => {
    var baseDir = path.join(__dirname, 'unignore');
    var funignore = ignore(baseDir);

    expect(funignore(path.join(baseDir, '.env'))).not.to.be.ok();
  });

});