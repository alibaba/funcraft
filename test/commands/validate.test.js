'use strict';

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
    await validate();
  });

  it('validate helloworld example', async () => {
    process.chdir('./examples/helloworld/');
    await validate();
  });

  it('validate java example', async () => {
    process.chdir('./examples/java/');
    await validate();
  });

  it('validate openid_connect example', async () => {
    process.chdir('./examples/openid_connect/');
    await validate();
  });

  it('validate tablestore-trigger example', async () => {
    process.chdir('./examples/tablestore-trigger/');
    await validate();
  });

  it('validate python example', async () => {
    process.chdir('./examples/python/');
    await validate();
  });

  it('validate segment example', async () => {
    process.chdir('./examples/segment/');
    await validate();
  });

  it('validate timer example', async () => {
    process.chdir('./examples/timer/');
    await validate();
  });

  it('validate wechat example', async () => {
    process.chdir('./examples/wechat/');
    await validate();
  });

});