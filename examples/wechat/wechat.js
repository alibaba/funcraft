'use strict';

const crypto = require('crypto');

const hook = require('fc-helper');
const WXBizMsgCrypt = require('wechat-crypto');

const TOKEN = 'random';
const ENCODING_AES_KEY = 'UcOZ19yTgocUdj2yb2EblpxPKorZs5GAOByUVWBb2By';
const APPID = 'wxb00e9505019a21c8';

function getSignature (timestamp, nonce, token) {
  var shasum = crypto.createHash('sha1');
  var arr = [token, timestamp, nonce].sort();
  shasum.update(arr.join(''));

  return shasum.digest('hex');
}

const cryptor = new WXBizMsgCrypt(TOKEN, ENCODING_AES_KEY, APPID);

exports.get = hook((req, res) => {
  const query = req.query;
  // 加密模式
  const encrypted = !!(query.encrypt_type && query.encrypt_type === 'aes' && query.msg_signature);
  const timestamp = query.timestamp;
  const nonce = query.nonce;
  const echostr = query.echostr;

  var valid = false;
  if (encrypted) {
    var signature = query.msg_signature;
    valid = signature === cryptor.getSignature(timestamp, nonce, echostr);
  } else {
    // 校验
    valid = query.signature === getSignature(timestamp, nonce, TOKEN);
  }

  if (!valid) {
    res.status = 401;
    res.send('Invalid signature');
  } else {
    if (encrypted) {
      var decrypted = cryptor.decrypt(echostr);
      // TODO 检查appId的正确性
      res.send(decrypted.message);
    } else {
      res.send(echostr);
    }
  }
});

exports.post = hook((req, res) => {
  const query = req.query;
  // 加密模式
  const encrypted = !!(query.encrypt_type && query.encrypt_type === 'aes' && query.msg_signature);
  const timestamp = query.timestamp;
  const nonce = query.nonce;

  if (!encrypted) {
    // 校验
    if (query.signature !== getSignature(timestamp, nonce, TOKEN)) {
      res.status = 401;
      res.send('Invalid signature');
      return;
    }
  }

  // 取原始数据
  var xml = req.body;
  console.log(xml);
  res.type = 'application/xml';
  res.send(xml);
  // // 保存原始xml
  // ctx.weixin_xml = xml;
  // // 解析xml
  // var result = await parseXML(xml);
  // var formatted = formatMessage(result.xml);
  // if (encrypted) {
  //   var encryptMessage = formatted.Encrypt;
  //   if (query.msg_signature !== this.cryptor.getSignature(timestamp, nonce, encryptMessage)) {
  //     ctx.status = 401;
  //     ctx.body = 'Invalid signature';
  //     return;
  //   }
  //   var decryptedXML = this.cryptor.decrypt(encryptMessage);
  //   var messageWrapXml = decryptedXML.message;
  //   if (messageWrapXml === '') {
  //     ctx.status = 401;
  //     ctx.body = 'Invalid signature';
  //     return;
  //   }
  //   var decodedXML = await parseXML(messageWrapXml);
  //   formatted = formatMessage(decodedXML.xml);
  // }

  // // 业务逻辑处理
  // const body = await handle(formatted);

  // /*
  //  * 假如服务器无法保证在五秒内处理并回复，可以直接回复空串。
  //  * 微信服务器不会对此作任何处理，并且不会发起重试。
  //  */
  // if (body === '') {
  //   ctx.body = '';
  //   return;
  // }

  // var replyMessageXml = reply(body, formatted.ToUserName, formatted.FromUserName);

  // if (!query.encrypt_type || query.encrypt_type === 'raw') {
  //   ctx.body = replyMessageXml;
  // } else {
  //   var wrap = {};
  //   wrap.encrypt = this.cryptor.encrypt(replyMessageXml);
  //   wrap.nonce = parseInt((Math.random() * 100000000000), 10);
  //   wrap.timestamp = new Date().getTime();
  //   wrap.signature = this.cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt);
  //   ctx.body = encryptWrap(wrap);
  // }

  // ctx.type = 'application/xml';
  // res.send('Hello world!\n');
});
