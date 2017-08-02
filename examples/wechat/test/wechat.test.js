'use strict';

const expect = require('expect.js');

const handler = require('../wechat.js');
const template = require('./support').template;
const makeQuery = require('./support').makeQuery;

describe('wechat', function () {
  it('GET should 401 without query', (done) => {
    var event = {
      'path': '/wechat',
      'httpMethod': 'GET',
      'headers': {},
      'queryParameters': {},
      'pathParameters': {},
      'body': '',
      'isBase64Encoded': false
    };
    handler.get(JSON.stringify(event), {}, function (err, data) {
      expect(err).to.not.be.ok();
      expect(data.statusCode).to.be(401);
      expect(data.body).to.be('Invalid signature');
      done();
    });
  });

  it('GET should ok', (done) => {
    var q = makeQuery('random');
    q.echostr = 'hehe';
    console.log(q);
    var event = {
      'path': '/wechat',
      'httpMethod': 'GET',
      'headers': {},
      'queryParameters': q,
      'pathParameters': {},
      'body': '',
      'isBase64Encoded': false
    };
    handler.get(JSON.stringify(event), {}, function (err, data) {
      expect(err).to.not.be.ok();
      expect(data.body).to.be('hehe');
      done();
    });
  });

  it('POST should ok', (done) => {
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
    handler.post(JSON.stringify(event), {}, function (err, data) {
      expect(err).to.not.be.ok();
      var body = data.body;

      expect(body).to.contain('<ToUserName><![CDATA[diaosi]]></ToUserName>');
      expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
      expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
      expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
      expect(body).to.contain('<Content><![CDATA[hehe]]></Content>');
      done();
    });
  });
});
