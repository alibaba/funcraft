'use strict';


const expect = require('expect.js');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const path = require('path');

const rmNasFile = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub().returns('/template.yml')
};

const rmStub = proxyquire('../../../lib/commands/nas/rm', {
  '../../validate/validate': validate,
  '../../nas/rm': rmNasFile,
  '../../tpl': tpl
});

describe('command rm test', () => {
  const options = 
    {
      recursive: true, 
      force: true
    };

  afterEach(() => {
    sandbox.reset();
  });
    
  it('valid nas path', async () => {
    const nasPath = 'nas://demo:/mnt/nas';

    await rmStub(nasPath, options);
    const mntDir = path.posix.join('/', 'mnt', 'nas');
    assert.calledWith(rmNasFile, 'demo', mntDir, options.recursive, options.force);
  });

  it('invalid nas path', async () => {
    const nasPath = '://demo://mnt/nas';
    let err;

    try {
      await rmStub(nasPath, options);
      assert.notCalled(rmNasFile);
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error('nas path err: ' + nasPath));

  });
});

