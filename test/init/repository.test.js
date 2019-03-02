'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();
const fs = {
  readFileSync: sandbox.stub()
};

const path = {
  resolve: (a, b) => b,
  join: (a, b) => b
};

const vcs = {
  clone: sandbox.stub()
};

const repositoryStub = proxyquire('../../lib/init/repository', {
  'fs': fs,
  'path': path,
  './vcs': vcs
});

describe('repository', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('with location is template name', async () => {
    const result = await repositoryStub.determineRepoDir({ location: 'foo', templates: { foo: '/path/foo/bar' }});
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: false});
  });

  it('with location is foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is https://github.com/foo/bar.git', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'https://github.com/foo/bar.git'});
    sandbox.assert.calledWith(vcs.clone, 'https://github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is git@github.com/foo/bar.git', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'git@github.com/foo/bar.git'});
    sandbox.assert.calledWith(vcs.clone, 'git@github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is gh:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'gh:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is gl:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'gl:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://gitlab.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is bb:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'bb:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://bitbucket.org/foo/bar', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });


  it('with location is github:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'github:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is gitlab:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'gitlab:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://gitlab.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is bitbucket:foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'bitbucket:foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'https://bitbucket.org/foo/bar', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is git@github.com:foo/bar.git', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'git@github.com:foo/bar.git'});
    sandbox.assert.calledWith(vcs.clone, 'git@github.com:foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is git+ssh://git@github.com/foo/bar.git', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'git+ssh://git@github.com/foo/bar.git'});
    sandbox.assert.calledWith(vcs.clone, 'git+ssh://git@github.com/foo/bar.git', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is hg+ssh://hg@bitbucket.org/foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: 'hg+ssh://hg@bitbucket.org/foo/bar'});
    sandbox.assert.calledWith(vcs.clone, 'hg+ssh://hg@bitbucket.org/foo/bar', '.', undefined);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: true});
  });

  it('with location is /path/foo/bar', async () => {
    vcs.clone.returns('/path/foo/bar');
    const result = await repositoryStub.determineRepoDir({ location: '/path/foo/bar'});
    sandbox.assert.notCalled(vcs.clone);
    expect(result).to.eql({ repoDir: '/path/foo/bar', clean: false});
  });

  it('get official templates', async () => {
    fs.readFileSync.returns(`{ "foo": "bar" }`);
    const templates = repositoryStub.getOfficialTemplates();
    expect(templates).to.eql({ foo: 'bar' });
  });


});