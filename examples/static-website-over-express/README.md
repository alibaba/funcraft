# Static website over express

这个示例工程展示了如何将静态网站部署到函数计算中.

## 前置条件

请确保您已经安装以下命令行工具:

+ [npm](https://nodejs.org/)
+ [fun](https://github.com/alibaba/funcraft)

## 快速开始

```bash
$ npm install && fun local start localhost
```

## 原理

0. Fc 自定义运行时启动成功后运行 bootstrap 脚本, 完成初始化.
0. 在 bootstrap 中我们启动了基于 express 的 HTTP 服务并监听 9000 端口.
0. 客户端请求由 express 转发到特定文件夹内的静态文件上.

## License

The MIT License
