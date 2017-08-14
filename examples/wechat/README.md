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

Modify the `wechat.js` file, replace following config with yourself token, encoding aes key, appid:

```js
const TOKEN = '<YOUR TOKEN>';
const ENCODING_AES_KEY = '<YOUR ENCODING AES KEY>';
const APPID = '<YOUR APP ID>';
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
