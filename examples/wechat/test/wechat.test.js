'use strict';

const expect = require('expect.js');

const { test } = require('fc-helper');
const handler = require('../wechat.js');
const { template, makeQuery } = require('./support');

describe('wechat', function () {
  it('GET should 401 without query', async () => {
    var event = {
      'path': '/wechat',
      'httpMethod': 'GET',
      'headers': {},
      'queryParameters': {},
      'pathParameters': {},
      'body': '',
      'isBase64Encoded': false
    };
    const data = await test(handler.get).run(JSON.stringify(event), {});
    expect(data.statusCode).to.be(401);
    expect(data.body).to.be('Invalid signature');
  });

  it('GET should ok', async () => {
    var q = makeQuery('random');
    q.echostr = 'hehe';
    var event = {
      'path': '/wechat',
      'httpMethod': 'GET',
      'headers': {},
      'queryParameters': q,
      'pathParameters': {},
      'body': '',
      'isBase64Encoded': false
    };
    const data = await test(handler.get).run(JSON.stringify(event), {});
    expect(data.body).to.be('hehe');
  });

  it('POST should ok', async () => {
    var info = {
      sp: 'nvshen',
      user: 'diaosi',
      type: 'text',
      text: '测试中'
    };

    var q = makeQuery('random');
    var event = {
      'path': '/wechat',
      'httpMethod': 'POST',
      'headers': {},
      'queryParameters': q,
      'pathParameters': {},
      'body': template(info),
      'isBase64Encoded': false
    };
    const data = await test(handler.post).run(JSON.stringify(event), {});

    const body = data.body;
    expect(body).to.contain('<ToUserName><![CDATA[diaosi]]></ToUserName>');
    expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
    expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
    expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
    expect(body).to.contain('<Content><![CDATA[hehe]]></Content>');
  });
});
