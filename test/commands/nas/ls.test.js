'use strict';


const expect = require('expect.js');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const lsNasFile = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub()
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
  
  beforeEach(async () => {
    tpl.detectTplPath.returns('/template.yml');
  });

  afterEach(() => {
    sandbox.restore();
  });
    
  it('valid nas path', async () => {
    const nasPath = 'nas://demo://mnt/nas';

    await lsStub(nasPath, options);
    assert.calledWith(lsNasFile, 'demo', '/mnt/nas', options.all, options.long);
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

