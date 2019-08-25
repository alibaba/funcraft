'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const { yellow } = require('colors');

const {
  showBuildNextTips
} = require('../../lib/build/tips');

describe('test showBuildNextTips', () => {

  beforeEach(() => {
    sandbox.stub(console, 'log').returns();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('test showBuildNextTips', async function () {
    showBuildNextTips();

    assert.calledWith(console.log, yellow(`\nTips for next step
======================
* Invoke Event Function: fun local invoke
* Invoke Http Function: fun local start
* Deploy Resources: fun deploy`));
  });
});

