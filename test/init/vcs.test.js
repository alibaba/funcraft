'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');
const path = require('path');

const sandbox = sinon.createSandbox();
const fs = {
  mkdirSync: sandbox.stub(),
  existsSync: sandbox.stub(),
  ensureDir: sandbox.stub(),
  moveSync: sandbox.stub()
};

const prompt = {
  promptForExistingPath: sandbox.stub()
};

const child_process = {
  spawnSync: sandbox.stub()
};

const commandExists = {
  sync: sandbox.stub()
};
const uuid = {
  v1: sandbox.stub()
};

const httpx = {
  request: sandbox.stub()
};

const vcsStub = proxyquire('../../lib/init/vcs', {
  'uuid': uuid,
  'fs-extra': fs,
  './prompt': prompt,
  'httpx': httpx,
  'child_process': child_process,
  'command-exists': commandExists
});

describe('vcs', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('clone with git not installed', async () => {
    commandExists.sync.returns(false);
    fs.existsSync.returns(true);
    const on = (event, listener) => {
      if (event === 'finish') {
        listener();
      } else if (event === 'end') {
        listener();
      }
      return { on };
    };
    httpx.request.returns({
      headers: { 'content-length': 1000 },
      on,
      pipe: () =>({ on })
    });
    await vcsStub.clone('https://github.com/foo/bar.git', '.');
    httpx.request.calledWith('https://codeload.github.com/foo/bar/zip/master', { timeout: 36000000, method: 'GET' });
  });

  it('clone with unknown repo type', async () => {
    fs.existsSync.returns(true);
    let err;
    try {
      await vcsStub.clone('https://foo.com/foo/bar.baz', '.');
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error('Unknown Repo Type.'));

  });

  it('clone with https://github.com/foo/bar.git', async () => {
    fs.existsSync.returns(true);
    commandExists.sync.returns(true);
    uuid.v1.returns('uuid');
    const repoUrl = 'https://github.com/foo/bar.git';
    const repoDir = await vcsStub.clone(repoUrl, '.');
    sandbox.assert.calledWith(child_process.spawnSync, 'git', ['clone', '--depth=1', repoUrl, '.fun-init-cache-uuid'], {cmd: repoDir, stdio: 'inherit'});
    expect(repoDir).to.be(path.join(process.cwd(), '.fun-init-cache-uuid'));
  });
});