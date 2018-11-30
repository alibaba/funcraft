# Fun

(have)Fun with Serverless

![logo.jpg](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181123143028.png)

[English](https://github.com/aliyun/fun/blob/master/README.md)

[Fun](https://github.com/aliyun/fun) 是一个用于支持 Serverless 应用部署的工具，能帮助您便捷地管理函数计算、API 网关、日志服务等资源。它通过一个资源配置文件（template.yml），协助您进行开发、构建、部署操作。

如果你想使用旧版本的语法，请[参考](https://github.com/aliyun/fun/blob/v1.x/README.md).

## 开始使用

Fun 作为一个命令行工具，内置了多个子命令，比如 config、local、deploy 等。

其中，config 子命令可以用来配置 fun，local 子命令可以用来本地运行调试函数，deploy 子命令可以将发布资源到线上。

为了让您尽快上手，我们准备了一系列教程：

- [安装教程](https://github.com/aliyun/fun/blob/master/docs/usage/installation-zh.md)：介绍了如何在 Mac、Linux 或者 Windows 上安装 Fun。
- [使用](https://github.com/aliyun/fun/blob/master/docs/usage/getting_started-zh.md)：通过一个简单的示例介绍了 Fun 的基本用法。
- **本地运行与调试**：关于如何本地运行、调试函数，以及介绍排查 bug 技巧的系列文章。
  - [开发函数计算的正确姿势 —— 使用 Fun Local 本地运行与调试](https://yq.aliyun.com/articles/672623)：介绍了 Fun Local 基本用法。
  - [开发函数计算的正确姿势 —— 爬虫](https://yq.aliyun.com/articles/672624): 通过一个实战场景，介绍了如何利用 Fun 工具从头开始开发一个 Serverless 应用。
  - [开发函数计算的正确姿势 —— 排查超时问题](https://yq.aliyun.com/articles/672627): 从一个 bug 开发，介绍了各种排查问题的技巧。
- [Fun 规范文档](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md): 详细介绍了 Fun 规范文档的细节。
- [更多示例](https://github.com/aliyun/fun/tree/master/examples)

## 反馈

如您在使用中遇到问题，可以在这里反馈 https://github.com/aliyun/fun/issues

## 参考

- [以函数计算作为 API 网关后端服务](https://help.aliyun.com/document_detail/54788.html)
- [函数计算](https://www.aliyun.com/product/fc)
- [API Gateway](https://www.aliyun.com/product/apigateway)
- [Fun 发布 2.0 新版本啦](https://yq.aliyun.com/articles/604490)
- [三十分钟快速搭建 serverless 网盘服务](https://yq.aliyun.com/articles/613780)

## 开源许可

The MIT License
