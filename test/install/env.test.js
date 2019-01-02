'use strict';

const { addEnv } = require('../../lib/install/env');
const expect = require('expect.js');

describe('env', ()=>{

  it('no_settings', () => {
    const envs = addEnv({});

    expect(envs).to.have.property('PATH', '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin');
    expect(envs).to.have.property('PYTHONPATH', '/code/.fun/python/lib/python2.7/site-packages:/code/.fun/python/lib/python3/site-packages');
    expect(envs).to.have.property('LD_LIBRARY_PATH', '/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib');
  });

  it('with_LD_LIBRARY_PATH', () => {
    const envs = addEnv({
      'LD_LIBRARY_PATH': '/usr/lib'
    });

    expect(envs).to.have.property('LD_LIBRARY_PATH', '/code/.fun/root/usr/lib/x86_64-linux-gnu:/usr/lib');
  });

  it('with_PATH', () => {
    const envs = addEnv({
      'PATH': '/usr/bin'
    });

    expect(envs).to.have.property('PATH', '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/usr/bin');
  });

  it('with_PYTHONPATH', () => {
    const envs = addEnv({
      'PYTHONPATH': '.'
    });

    expect(envs).to.have.property('PYTHONPATH', '/code/.fun/python/lib/python2.7/site-packages:/code/.fun/python/lib/python3/site-packages:.');
 
  });
});