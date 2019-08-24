'use strict';

const os = require('os');
const pty = require('node-pty');
const suppose = require('suppose');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

class ExpectedShell {

  constructor(args = [], options = {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: Object.assign({}, process.env, {
      PS1: '\\#$',
      TERM: 'dumb'
    })
  }) {
    this.args = args;
    this.options = options;
    this.supposeStream = new suppose.stream();
  }

  when(expect, response) {
    this.supposeStream.when(expect);

    if (response) { this.respond(response); }

    return this;
  }

  respond(response) {
    if (response instanceof Function)
    { this.supposeStream.respond(function () {
      var argv = Array.prototype.slice.call(arguments);
      argv.unshift(this.pty.process);

      return response.apply(self, argv);
    }); }
    else
    { this.supposeStream.respond(response); }

    return this;
  }

  end(callback) {

    this.pty = pty.spawn(shell, this.args, this.options);
    this.pty.pipe(this.supposeStream).pipe(this.pty);
    const self = this;
    this.pty.on('exit', () => {
      this.supposeStream.unpipe(this.pty);
      callback.call(self);
    });
    this.pty.on('data', (data) => console.log(data));

    return this.pty;
  }

}

module.exports = {
  ExpectedShell
};