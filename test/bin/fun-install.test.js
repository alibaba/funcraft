'use strict';

const { ExpectedShell } = require('./shell');

describe('Integration::sbox', function() {
  this.timeout(4000);

  it('tty=true, interactive=true', (done) => {
    new ExpectedShell()
      .when('1$').respond('node bin/fun.js install sbox --runtime nodejs8 --interactive\r')
      .when('root@fc-nodejs8:/code#  \b \b').respond('exit\r')
      .when('2$').respond('exit\r')
      .end(done);
  });

  it('tty=false, interactive=false', (done) => {
    new ExpectedShell()
      .when('1$').respond('node bin/fun.js install sbox --runtime nodejs8 --cmd \'echo hello\'\r')
      .when('hello\r\n2$').respond('exit\r')
      .end(done);
  });

  it('tty=false, interactive=true', (done) => {
    new ExpectedShell()
      .when('1$').respond('echo hello | node bin/fun.js install sbox --runtime nodejs8 --interactive --cmd \'cat -\'\r')
      .when('hello\r\n2$').respond('exit\r')
      .end(done);
  });

  it('env', (done) => {
    new ExpectedShell()
      .when('1$').respond('node bin/fun.js install sbox --runtime nodejs8 --env A=b --cmd \'bash -c "env | grep A="\'\r')
      .when('A=b\r\n2$').respond('exit\r')
      .end(done);
  });

});

