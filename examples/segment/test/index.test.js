'use strict';

const { test } = require('fc-helper');
const assert = require('assert');

const handler = require('../index.js');

describe('hello world', function () {
  it('should ok', async () => {
    var args = [
      "这是一个基于Node.js的中文分词模块。"
    ];
    var event = {
      'path': '/wechat',
      'httpMethod': 'POST',
      'headers': {},
      'queryParameters': {},
      'pathParameters': {},
      'body': JSON.stringify(args),
      'isBase64Encoded': false
    };
    var tester = test(handler.doSegment);
    const res = await tester.run(JSON.stringify(event), '{}');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(res.body), [
      {"w":"这是","p":0},
      {"w":"一个","p":2097152},
      {"w":"基于","p":262144},
      {"w":"Node.js","p":8},
      {"w":"的","p":8192},
      {"w":"中文","p":1048576},
      {"w":"分词","p":4096},
      {"w":"模块","p":1048576},
      {"w":"。","p":2048}
    ]);
  });
});
