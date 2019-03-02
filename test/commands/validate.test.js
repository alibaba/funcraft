'use strict';

const expect = require('expect.js');

const validate = require('../../lib/commands/validate');

describe('validate template', () => {
  var prevCWD;
  beforeEach(() => {
    prevCWD = process.cwd();
  });
  afterEach(() => {
    process.chdir(prevCWD);
  });

  it('validate datahub example', async () => {
    process.chdir('./examples/datahub/');
    expect(await validate()).to.be(true);
  });

  it('validate helloworld example', async () => {
    process.chdir('./examples/helloworld/');
    expect(await validate()).to.be(true);
  });

  it('validate java example', async () => {
    process.chdir('./examples/java/');
    expect(await validate()).to.be(true);
  });

  it('validate openid_connect example', async () => {
    process.chdir('./examples/openid_connect/');
    expect(await validate()).to.be(true);
  });

  it('validate tablestore-trigger example', async () => {
    process.chdir('./examples/tablestore-trigger/');
    expect(await validate()).to.be(true);
  });

  it('validate python example', async () => {
    process.chdir('./examples/python/');
    expect(await validate()).to.be(true);
  });

  it('validate segment example', async () => {
    process.chdir('./examples/segment/');
    expect(await validate()).to.be(true);
  });

  it('validate timer example', async () => {
    process.chdir('./examples/timer/');
    expect(await validate()).to.be(true);
  });

  it('validate wechat example', async () => {
    process.chdir('./examples/wechat/');
    expect(await validate()).to.be(true);
  });

});