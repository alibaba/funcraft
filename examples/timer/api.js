'use strict';

/**
 * Module denpendencies
 */
const crypto = require('crypto');
const querystring = require('querystring');
const httpx = require('httpx');

const URL = 'https://api.seniverse.com/v3';

class API {
  constructor(uid, secretKey) {
    this.uid = uid;
    this.secretKey = secretKey;
  }

  getSignatureParams() {
    var params = {};
    params.ts = Math.floor((new Date()).getTime() / 1000); // 当前时间戳（秒）
    params.ttl = 300; // 过期时间
    params.uid = this.uid; // 用户ID

    var str = querystring.encode(params); // 构造请求字符串
    // 使用 HMAC-SHA1 方式，以 API 密钥（key）对上一步生成的参数字符串进行加密
    params.sig = crypto.createHmac('sha1', this.secretKey)
      .update(str)
      .digest('base64'); // 将加密结果用 base64 编码，并做一个 urlencode，得到签名 sig

    return params;
  }

  async request(path, append) {
    var params = this.getSignatureParams();
    Object.assign(params, append);

    // 将构造的 URL 直接在后端 server 内调用
    const url = `${URL}${path}?${querystring.encode(params)}`;
    const response = await httpx.request(url);
    const body = await httpx.read(response, 'utf8');
    const data = JSON.parse(body);
    if (data && data.status_code) {
      var err = new Error(`${data.status}`);
      err.code = data.status_code;
      throw err;
    }

    return data;
  }

  getWeatherNow(location, opts = {}) {
    return this.request('/weather/now.json', {
      location,
      ...opts
    });
  }

  getWeatherDaily(location, opts = {}) {
    return this.request('/weather/daily.json', {
      location,
      ...opts
    });
  }
}

module.exports = API;
