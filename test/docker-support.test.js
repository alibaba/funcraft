'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const dockerSupport = require('../lib/docker-support');
const fs = require('fs-extra');

describe('test getMountPathsNotSharedToDocker', () => {
  let readFile;
  beforeEach(() => {
    readFile = sandbox.stub(fs, 'readFile');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('mount paths all shared to docker', async () => {
    readFile.returns('{}');
    const mounts = [{'Source': '/Users/test'}, {'Source': '/Volumes/test'}];

    const res = await dockerSupport.findPathsOutofSharedPaths(mounts);
    expect(res).to.eql([]);
  });

  it('mount paths not shared to docker', async () => {
    readFile.returns('{}');
    const mounts = [{'Source': '/uuu/test'}, {'Source': '/vvv/test'}];

    const res = await dockerSupport.findPathsOutofSharedPaths(mounts);
    expect(res).to.eql(['/uuu/test', '/vvv/test']);
  });

  
});