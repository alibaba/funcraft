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

  it('POST2 should ok', (done) => {
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
      'queryParameters': {
        signature: '7f03d318e110d9cddfecc45ba3d13a9c5df4dff1',
        timestamp: '1501655321',
        nonce: '774472437',
        openid: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
        encrypt_type: 'aes',
        msg_signature: '67d63f2cc781b21dfd6f350c3fec60b215bc166f'
      },
      'pathParameters': {},
      'body': '<xml> <ToUserName><![CDATA[gh_d3e07d51b513]]></ToUserName> <Encrypt><![CDATA[xtYZlSTmSecvfi0Drb+qHIgwvs0CMiNEqG73+bJkPFAp0cu0ALOZ8CFTFWEEJZDHVByB/s2ImUHgXtpJB4a7HRqudCKpiC2Lsmau3mJ2qyG5pY4yEA57Sr0vrhuYyDkFp2vcbhbXLSqT3z20mZ2dfCmkWdudfJn04m2i4WHiHq7muTeLrF3GfXwfQ0ynGS83QE+ztMDFCwsAQ7+X5VsI0M4QV48V/ogf6vbCDAly6BZe4J0J0IdeYZxp2Ry1ElcJjNPVExUoDmHF5ejyySo3w40XT4FxteEoeZHqKAdoe9ENEVsdc813uj52KMBpzhvyGrUDDX6XpK5vfyVzJKF/QstvSaCHWYCv8ZBgg24FMZoz418HcUF/hjSvQslENAGHcQmnmml1cDlK3QfuWO3aEsCgxTKSZD8e7jeBH9BqwRI=]]></Encrypt> </xml>',
      'isBase64Encoded': false
    };
    handler.post(JSON.stringify(event), {}, function (err, data) {
      expect(err).to.not.be.ok();
      var body = data.body;
      console.log(body);
      done();
    });
  });

});
