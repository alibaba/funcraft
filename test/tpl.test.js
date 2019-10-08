'use strict';

const tpl = require('../lib/tpl');
const fs = require('fs-extra');
const path = require('path');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();

describe('test detectProjectRoot', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('test normal', () => {
    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(path.join(process.cwd(), '.fun', 'build', 'artifacts', 'template.yml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), '.fun', 'build', 'artifacts', 'template.yaml')).resolves(false);
    pathExistsStub.withArgs(path.join(process.cwd(), 'template.yml')).resolves(true);

    expect(tpl.detectProjectRoot(path.join('template.yml'))).to.eql(process.cwd());
  });

  it('test built template yml', () => {
    sandbox.stub(fs, 'pathExists').withArgs(path.join(tpl.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'template.yml')).resolves(true);
    expect(tpl.detectProjectRoot(path.join(process.cwd(), '.fun', 'build', 'artifacts', 'template.yml'))).to.eql(process.cwd());
  });
});