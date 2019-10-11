'use strict';

const tpl = require('../lib/tpl');
const fs = require('fs-extra');
const path = require('path');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();

describe('test detectNasBaseDir', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('test normal', () => {
    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yaml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), 'template.yml')).resolves(true);

    expect(tpl.detectNasBaseDir(path.join('template.yml'))).to.eql(path.join(process.cwd(), tpl.DEFAULT_NAS_PATH_SUFFIX));
  });

  it('test built template yml', () => {
    sandbox.stub(fs, 'pathExists').withArgs(path.join(tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml')).resolves(true);
    expect(tpl.detectNasBaseDir(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml'))).to.eql(path.join(process.cwd(), tpl.DEFAULT_NAS_PATH_SUFFIX));
  });
});

describe('test detectTmpDir', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('test normal', () => {
    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yaml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), 'template.yml')).resolves(true);

    expect(tpl.detectTmpDir(path.join('template.yml'))).to.eql(path.join(process.cwd(), tpl.DEFAULT_TMP_INVOKE_PATH_SUFFIX));
  });

  it('test built template yml', () => {
    sandbox.stub(fs, 'pathExists').withArgs(path.join(tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml')).resolves(true);
    expect(tpl.detectTmpDir(path.join(process.cwd(), tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml'))).to.eql(path.join(process.cwd(), tpl.DEFAULT_TMP_INVOKE_PATH_SUFFIX));
  });
});