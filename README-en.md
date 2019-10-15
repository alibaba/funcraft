# Funcraft

(have)Fun with Serverless

![logo.jpg](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181123143028.png)

[中文文档](https://github.com/aliyun/fun/blob/master/README-zh.md)

[Fun](https://github.com/aliyun/fun) is a development tool for serverless applications. It can help you to efficiently arrange cloud resources such as Function Compute, API Gateway, Log Service and so on. You can use it to develop，build and deploy FC by describing relative resources in a `template.yml` file.

If you want to use the old syntax, please refer to [README.md](https://github.com/aliyun/fun/blob/v1.x/README.md).

## Get Started

As a command-line tool, Fun has built-in subcommands such as config, local, deploy, and so on.

The config subcommand can be used to configure fun, the local subcommand can be used to run the debugging function locally, and the deploy subcommand can publish your resources.

We have prepared a series of tutorials to help you use the Fun tool more easily:

- [Installation](https://github.com/aliyun/fun/blob/master/docs/usage/installation.md): Learn how to install Fun on Mac, Linux or Windows.
- [Getting Started](https://github.com/aliyun/fun/blob/master/docs/usage/getting_started.md): The basic usage of Fun is introduced with a simple example.
- [Specification](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md): Introduces the syntax of the fun's template.yml file.
- **Series articles**:
  - **Grammar Validation**：Fun provides a powerful grammar validation function, and allows users to easily correct it by accurately reporting error information.
    - [开发函数计算的正确姿势 —— Fun validate 语法校验排错指南](https://yq.aliyun.com/articles/703144)：Introduced how to modify the error grammar description in template.yml according to the error information.
  - **Custom templates**: Articles on how to quickly build a project using `fun init`.
    - [开发函数计算的正确姿势 —— 使用 Fun Init 初始化项目](https://yq.aliyun.com/articles/674363): Introduced the basic usage of `fun init`.
    - [Fun Init 自定义模板](https://yq.aliyun.com/articles/674364): Introduce how to develop a `fun init` template.
    - **Third-party templates**: Third-party templates that can be quickly initialized directly by `fun init [repo]`.
      - [puppeteer 模板项目](https://github.com/vangie/puppeteer-example/): Screenshot service based on puppeteer deployment on `Function Compute` service.
      - [函数计算 R 语言模板项目](https://github.com/vangie/rlang-example)：Template project for R language, can be used directly.
      - [开发函数计算的正确姿势——支持 ES6 语法和 webpack 压缩](https://yq.aliyun.com/articles/701714)：Help quickly build a Function-Compute of nodejs project skeleton, support es6 code compiled into es5.
      - [函数计算实现 oss 上传较小 zip 压缩文件的自动解压](https://github.com/coco-super/simple-fc-uncompress-service-for-oss)：Help quickly build a Function-Compute project to unzip oss files using simple method
      - [函数计算实现 oss 上传较大 zip 压缩文件的自动解压](https://github.com/coco-super/streaming-fc-uncompress-service-for-oss)：Help quickly build a Function-Compute project to unzip oss files using streaming method
      - [函数计算 TensorFlow CharRNN 五言绝句古诗模板](https://github.com/vangie/poetry)：Template project for writing Five-Character Verse using TensorFlow CharRNN.
      - [函数计算 selenium chrome java 模板项目](https://github.com/vangie/packed-selenium-java-example)：Java template for selenium chrome compressed by brotli.
      - [函数计算 couchbase 模板项目](https://github.com/vangie/couchbase-example)：Template project for installing and configuring couchbase on function compute.
      - [express 项目接入函数计算](https://github.com/muxiangqiu/fc-express-nodejs8)：Help quickly build a express project of Function-Compute.
      - [nextjs 应用接入到函数计算](https://github.com/muxiangqiu/fc-next-nodejs8)：Help quickly build a next.js project of Function-Compute.
      - [es6 代码编译成 es5 项目模板](https://github.com/muxiangqiu/fc-skeleton-nodejs8)：Help quickly build a webpack project of Function-Compute in order to compile es6 to es5.
      - [Serverless 微服务实践-移动应用包分发服务](https://github.com/coco-super/package-distribution-service-for-serverless)：Help quickly build a package distribution project based on serverless architecture of Function-Compute.
  - **Dependences installation**: Articles on how to use fun install to quickly install  dependencies.
    - [开发函数计算的正确姿势 —— 安装第三方依赖](https://yq.aliyun.com/articles/688062): introduce the basic usage of fun install.
    - [函数运行环境系统动态链接库版本太低？函数计算 fun 神助力分忧解难](https://yq.aliyun.com/articles/690856): Introduce how to use fun install to upgrade the system Dynamic-link libraries.
    - **How fun install works**: Recommended ways for dependences installation before `fun install` was introduced. It is now recommended to use `fun install` first. The following article can be used to understand the principle of `fun install` in order to use fun install better.
        - [Installing a Dependency Library for Function Compute](https://yq.aliyun.com/articles/602147)：Summarized the methods of each language dependent installation.
        - [Using Python to Connect Function Compute to SQL Server](https://yq.aliyun.com/articles/691081): Introduce how to use the fc-docker to install the pymssql library. The idea introduced in this article is similar to the underlying implementation of fun install.
        - [手把手教您将 libreoffice 移植到函数计算平台](https://yq.aliyun.com/articles/674330): Introduce how to use Fc-docker to deploy libreoffice to Function compute.
  - **Running and debugging locally**: A series on how to run locally, debug functions, and tips on troubleshooting related issues.
    - [Guidelines for Function Compute Development - Use Fun Local for Local Running and Debugging](https://yq.aliyun.com/articles/686333): introduce the basic usage of Fun Local.
    - [开发函数计算的正确姿势 —— Http Trigger 本地运行调试](https://yq.aliyun.com/articles/683683):  Demonstrates how to run and debug Http Trigger functions locally.
    - [开发函数计算的正确姿势 —— 本地运行、调试、发布 NAS 函数](https://yq.aliyun.com/articles/683684):  Demonstrates how to run and debug functions configured with NAS services locally.
    - [开发函数计算的正确姿势 —— Api 本地运行调试](https://yq.aliyun.com/articles/683685):  Demonstrates how to run and debug functions locally through the API.
  - **Deploy**: Articles on how to quickly deploy Function Compute.
    - [开发函数计算的正确姿势 —— 部署 API 网关](https://yq.aliyun.com/articles/689185): Introduce how to deploy the API Gateway + Function Compute application.
    - [Guidelines for Function Compute Development —— OSS Trigger](https://yq.aliyun.com/articles/702667): Introduce how to deploy the OSS Trigger + Function Compute application.
    - [开发函数计算的正确姿势 —— CDN 触发器](https://yq.aliyun.com/articles/700808)：Introduce how to deploy the OSS Trigger + Function Compute application.
  - **Fun in action**:
    - [Guidelines for Function Compute Development - Crawler](https://yq.aliyun.com/articles/686340): How to use the Fun tool to develop a Serverless application from scratch.
    - [Guidelines for Function Compute Development - Troubleshoot Timeout Issues](https://yq.aliyun.com/articles/686349): Demonstrates how to solve a series of bugs and introduces the tricks of debug.
    - [开发函数计算的正确姿势 —— 开发 WordPress 应用](https://yq.aliyun.com/articles/683686): Demonstrates how to develop and debug a WordPress web application locally.
    - [开发函数计算的正确姿势 —— 开发 NAS 文件管理应用](https://yq.aliyun.com/articles/685803): Demonstrates how to develop and debug a NAS file manager web application locally.
    - [开发函数计算的正确姿势——网页截图服务](https://yq.aliyun.com/articles/688927): Introduce how to use Function Compute to quickly develop web page screenshot service.
    - [五分钟教你如何用函数计算部署钉钉群发机器人](https://yq.aliyun.com/articles/682133)：Introduce how to use the Function Compute to quickly build a DingTalk robot.
    - [五分钟上线——函数计算 Word 转 PDF 云服务](https://yq.aliyun.com/articles/674284): ：Introduce how to migrate ibreoffice to Function Compute in order to convert word to pdf.
    - [用函数计算搭建微服务——云客服访客名片](https://yq.aliyun.com/articles/674378): Introduce how to use the Function Compute to build a micro service of visitor card.
    - [三分钟学会如何在函数计算中使用 puppeteer](https://yq.aliyun.com/articles/602877): Introduce how to use puppeteer in Function Compute.
    - [函数计算部署机器学习遇到的问题和解法](https://yq.aliyun.com/articles/630289)：Some problems that may be encountered when machine learning is deployed to Function Compute and some solutions to related problems.
- [FAQ](https://github.com/aliyun/fun/blob/master/docs/usage/faq.md): Frequently asked questions and answers when using fun.
- [More Examples](https://github.com/aliyun/fun/tree/master/examples)

## References

- [以函数计算作为 API 网关后端服务](https://help.aliyun.com/document_detail/54788.html)
- [函数计算](https://www.aliyun.com/product/fc)
- [API Gateway](https://www.aliyun.com/product/apigateway)
- [Fun 发布 2.0 新版本啦](https://yq.aliyun.com/articles/604490)
- [函数计算工具链新成员 —— Fun Local 发布啦](https://yq.aliyun.com/articles/672656)
- [三十分钟快速搭建 serverless 网盘服务](https://yq.aliyun.com/articles/613780)
- [Fc Docker](https://github.com/aliyun/fc-docker)

## License

The MIT License
