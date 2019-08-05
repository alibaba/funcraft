'use strict';


const expect = require('expect.js');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const path = require('path');
const lsNasFile = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub().returns('/template.yml')
};

const lsStub = proxyquire('../../../lib/commands/nas/ls', {
  '../../validate/validate': validate,
  '../../nas/ls': lsNasFile,
  '../../tpl': tpl
});

describe('command ls test', () => {
  const options = 
    {
      all: true, 
      long: true
    };

  afterEach(() => {
    sandbox.reset();
  });
    
  it('valid nas path', async () => {
    const nasPath = 'nas://demo:/mnt/nas';

    await lsStub(nasPath, options);
    const mntDir = path.join('/', 'mnt', 'nas');
    assert.calledWith(lsNasFile, 'demo', mntDir, options.all, options.long);
  });

  it('invalid nas path', async () => {
    const nasPath = '://demo://mnt/nas';
    let err;

    try {
      await lsStub(nasPath, options);
      assert.notCalled(lsNasFile);
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error('nas path err: ' + nasPath));
    
  });
});

