# Wechat demo

## Installation

You should install dependencies first:

### fun

```sh
$ npm install @alicloud/fun -g
```

### dependencies

```sh
$ npm install
```

## Deploy

Modify the `config.js` file, replace following config with yourself token, encoding aes key, appid:

```js
exports.config = {
  token: '<YOUR TOKEN>',
  encodingAESkey: '<YOUR ENCODING AES KEY>',
  appid: '<YOUR APP ID>'
};
```

Deploy it to AliCloud API Gateway & Function Compute:

```sh
$ fun deploy
URL: GET http://<api group id>-cn-hangzhou.alicloudapi.com/wechat => cn-shanghai/wechat/get
URL: POST http://<api group id>-cn-hangzhou.alicloudapi.com/wechat => cn-shanghai/wechat/post
```

## Settings

Set the url in Wechat MP admin console.

Demo:

![demo](./figures/qrcode.jpg)

## Test

```sh
npm run test
```

## License

The MIT License
