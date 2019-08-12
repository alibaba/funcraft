'use strict';

const expect = require('expect.js');

const { setProcess } = require('./test-utils');

const client = require('../lib/client');

describe('without local ~/.fcli/config.yaml', () => {
  
  let restoreProcess;

  beforeEach(() => {
    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
      FC_ENDPOINT: 'test fc endpoint',
      REGION: 'cn-beijing'
    });
  });

  afterEach(() => {
    restoreProcess();
  });

  it('with FC_ENDPOINT', async () => {    
    const fcClient = await client.getFcClient();
    expect(fcClient.endpoint).to.eql('test fc endpoint');
  });

  it('without FC_ENDPOINT', async () => {  
    delete process.env.FC_ENDPOINT;
    const fcClient = await client.getFcClient();
    expect(fcClient.endpoint).to.eql('https://testAccountId.cn-beijing.fc.aliyuncs.com');
  });
});