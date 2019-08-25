'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const hook = require('fc-helper');
const kitx = require('kitx');
const zip = require('./zip');

function pkg(deps) {
  return `{
  "dependencies": ${JSON.stringify(deps)}
}`;
}

exports.index = hook(function (req, res) {
  const post = JSON.parse(req.body);
  const runtime = post.runtime;
  const deps = pkg(post.dependencies);
  const digest = kitx.md5(`${runtime}:${deps}`, 'hex');
  var dir = `/tmp/${digest}`;
  try {
    fs.mkdirSync(dir);
  } catch (ex) {
    // ignore error
  }

  const pkgPath = path.join(dir, 'package.json');
  fs.writeFileSync(pkgPath, deps);
  try {
    execSync('npm i --registry=https://registry.npm.taobao.org', {
      cwd: dir
    });
  } catch (ex) {
    res.send({ok: false, message: ex.message});
    return;
  }

  zip(dir).then((base64) => {
    const data = {
      zip: base64
    };
    // HOW-TO：利用缓存
    res.send({ok: true, data: data});
  }, (err) => {
    res.send({ok: false, message: err.message});
  });
});
