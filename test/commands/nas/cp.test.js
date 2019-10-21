'use strict';

const os = require('os');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const path = require('path');
const mockdata = require('./mock-data');
const validate = sandbox.stub();
const { getBaseDir } = require('../../../lib/tpl');
const tpl = {
  detectTplPath: sandbox.stub(), 
  getTpl: sandbox.stub()
};
const nasCp = sandbox.stub();
const cpStub = proxyquire('../../../lib/commands/nas/cp', {
  '../../validate/validate': validate,
  '../../nas/cp': nasCp,
  '../../tpl': tpl
});

describe('command cp test', () => {
  const options = 
    {
      recursive: true, 
      clobber: true
    };
  const srcPath = 'src path';
  const dstPath = 'dst path';
  const tplPath = path.join(os.tmpdir(), 'template.yml'); 
  beforeEach(() => {
    tpl.detectTplPath.returns(tplPath);
    tpl.getTpl.returns(mockdata.tpl);
  });
  
  afterEach(() => {
    sandbox.reset();
  });
    
  it('normal test', async () => {

    await cpStub(srcPath, dstPath, options);

    const baseDir = getBaseDir(tplPath);
    const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'cp');
    assert.calledWith(nasCp, srcPath, dstPath, options.recursive, !options.clobber, localNasTmpDir, mockdata.tpl, baseDir, false);
  });
});
