# Funcraft

(have)Fun with Serverless

![logo.jpg](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181123143028.png)

[English](https://github.com/aliyun/fun/blob/master/README-en.md)

[Fun](https://github.com/aliyun/fun) 是一个用于支持 Serverless 应用部署的工具，能帮助您便捷地管理函数计算、API 网关、日志服务等资源。它通过一个资源配置文件（template.yml），协助您进行开发、构建、部署操作。

如果你想使用旧版本的语法，请[参考](https://github.com/aliyun/fun/blob/v1.x/README.md).

## 开始使用

Fun 作为一个命令行工具，内置了多个子命令，比如 config、local、deploy 等。

其中，config 子命令可以用来配置 fun，local 子命令可以用来本地运行调试函数，deploy 子命令可以将资源发布到线上。

为了让您尽快上手，我们准备了一系列教程：

- [安装教程](https://github.com/aliyun/fun/blob/master/docs/usage/installation-zh.md)：介绍了如何在 Mac、Linux 或者 Windows 上安装 Fun。
- [快速开始](https://github.com/aliyun/fun/blob/master/docs/usage/getting_started-zh.md)：通过一个简单的示例介绍了 Fun 的基本用法。
- [Fun 规范文档](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md): 详细介绍了 Fun 规范文档的细节。
- Fun 基本功能介绍：
	- [Fun Config 介绍](https://help.aliyun.com/document_detail/146702.html): 介绍如何进行 Fun 工具的配置。
	- [Fun Init 介绍](https://help.aliyun.com/document_detail/146946.html): 介绍如何使用 fun init 命令快速创建函数计算应用。
	- [Fun Local 介绍](https://help.aliyun.com/document_detail/146711.html): 介绍如何使用 fun local 进行函数的本地运行、调试。
	- [Fun Install 介绍](https://help.aliyun.com/document_detail/146967.html): fun install 是 fun 工具的一个子命令，用于安装 pip 和 apt 依赖，提供了命令行接口和 Funfile 描述文件两种形式。
	- [Fun Build 介绍](https://help.aliyun.com/document_detail/147039.html): 介绍了如何使用 fun build 命令完成编译型 runtime 比如 java 函数的构建。
	- [Fun Nas 介绍](https://help.aliyun.com/document_detail/147089.html): 介绍如何通过 fun nas 管理 nas 服务上的文件以及上传本地文件到 nas 服务。
	- [Fun Deploy 介绍](https://help.aliyun.com/document_detail/147077.html): 介绍如何通过 fun deploy 命令部署函数。
- 深度集成 Fun 的工具：
  - [Aliyun Serverless VSCode Extension](https://github.com/alibaba/serverless-vscode)
  - [FC WebIDE](https://ide.fc.aliyun.com/cn-hangzhou)
  - [Cloud Toolkit](https://cn.aliyun.com/product/cloudtoolkit)
- **系列文章**：
  - **语法校验**：Fun 提供了比较强大的语法校验功能，并通过精准的报错信息，让用户可以方便的将其修正。
    - [开发函数计算的正确姿势 —— Fun validate 语法校验排错指南](https://yq.aliyun.com/articles/703144)：介绍了根据报错信息修正 template.yml 中的错误语法描述。
  - **自定义模板**：关于如何使用 fun init 快速构建项目的文章。
    - [开发函数计算的正确姿势 —— 使用 Fun Init 初始化项目](https://yq.aliyun.com/articles/674363)：介绍了 fun init 的基本用法。
    - [Fun Init 自定义模板](https://yq.aliyun.com/articles/674364)：介绍了如何开发 fun init 模板。
    - **第三方模板**: 第三方模板，可以直接通过 `fun init [repo]` 的方式快速初始化一个项目。
      - [puppeteer 模板项目](https://github.com/vangie/puppeteer-example/)：基于 puppeteer 的部署在函数计算上的截图服务。
      - [函数计算 R 语言模板项目](https://github.com/vangie/rlang-example)：R 语言的模板项目，可以直接使用。
      - [开发函数计算的正确姿势——支持 ES6 语法和 webpack 压缩](https://yq.aliyun.com/articles/701714)：帮助快速搭建一个函数计算 nodejs 项目骨架，支持 es6 代码编译成 es5。
      - [函数计算实现 oss 上传较小 zip 压缩文件的自动解压](https://github.com/coco-super/simple-fc-uncompress-service-for-oss)：快速搭建 oss 上传较小 zip 压缩文件自动解压（简单法）的模板项目。
      - [函数计算实现 oss 上传较大 zip 压缩文件的自动解压](https://github.com/coco-super/streaming-fc-uncompress-service-for-oss)：快速搭建 oss 上传超大 zip 压缩文件自动解压（流式法）的模板项目。
      - [函数计算 TensorFlow CharRNN 五言绝句古诗模板](https://github.com/vangie/poetry)：介绍把一个 TensorFlow CharRNN 训练的自动写五言绝句古诗的模型部署到函数计算。
      - [函数计算 selenium chrome java 模板项目](https://github.com/vangie/packed-selenium-java-example)：一个使用 brotli 算法压缩的 selenium chrome java 模板项目。
      - [函数计算 couchbase 模板项目](https://github.com/vangie/couchbase-example)：该项目模板是一个在阿里云函数计算平台 nodejs8 环境下安装并配置 couchbase 的模板项目。
      - [express 项目接入函数计算](https://github.com/muxiangqiu/fc-express-nodejs8)：通过该模板，可以快速将 express 项目接入函数计算。
      - [nextjs 应用接入到函数计算](https://github.com/muxiangqiu/fc-next-nodejs8)：提供了一个 fun 模块，通过该模板，三分钟就可以让 next.js 应用在函数计算中运行起来。
      - [es6 代码编译成 es5 项目模板](https://github.com/muxiangqiu/fc-skeleton-nodejs8)：提供一个 fun 模板，通过 webpack 将 es6 代码编译成 es5，并且剪切打包压缩成一个 js 文件，然后将该 js 文件上传到函数计算中运行。
      - [函数计算狗和猫图像分类模版项目](https://github.com/awesome-fc/cat-dog-classify)：轻松搭建一个可以实现狗和猫图像分类器的深度学习模版项目。
      - [Serverless 微服务实践-移动应用包分发服务](https://github.com/coco-super/package-distribution-service-for-serverless)：提供一个基于函数计算 Serverless 架构的包分发服务模版项目。
  - **依赖安装**：关于如何使用 fun install 快速安装函数依赖的文章。
    - [开发函数计算的正确姿势 —— 依赖安装方法一览](https://yq.aliyun.com/articles/719107)：从用户需求的视角对安装依赖的方式进行简单分类，以便于用户可以根据自己的需求，寻找到正确的解决方法。
    - [开发函数计算的正确姿势——使用交互模式安装依赖](https://yq.aliyun.com/articles/716663)：介绍了 Fun 使用交互模式安装依赖，除了支持交互模式，沿用了指定 runtime 启动 sbox，也实现了 fun 风格的指定函数启动 sbox，更加便利。
    - [Funfile 功能介绍](https://yq.aliyun.com/articles/719100)：介绍了使用 Funfile 构造函数计算的交付产物。Funfile 中包含了一系列的命令，Fun 会忠实地执行这些步骤，最终产出“交付产物”。
    - [开发函数计算的正确姿势 —— 安装第三方依赖](https://yq.aliyun.com/articles/688062)：介绍了 fun install 的基本用法。
    - [函数运行环境系统动态链接库版本太低？函数计算 fun 神助力分忧解难](https://yq.aliyun.com/articles/690856)：介绍了如何利用 fun install，升级系统动态链接库。
    - **install 原理介绍**：fun install 功能推出之前推荐的方法，现在更推荐优先使用 fun install。下面的文章，可以作为了解 install 的原理，以便更好的使用 fun install。
        - [函数计算安装依赖库方法小结](https://yq.aliyun.com/articles/602147)：总结了各个语言依赖安装的方法。
        - [函数计算 Python 连接 SQL Server 小结](https://yq.aliyun.com/articles/672131)：介绍了如何利用 fc-docker 安装 pymssql 库。该文章介绍的思路，与 fun install 的底层实现思路是类似的。
        - [手把手教您将 libreoffice 移植到函数计算平台](https://yq.aliyun.com/articles/674330)：介绍了如何利用 fc-docker 将 libreoffice 移植到函数计算。
  - **源码编译**：关于如何使用 fun build 编译 java 等编译型语言函数代码的文章。
    - [开发函数计算的正确姿势 —— 使用 Fun Build 构建函数](https://yq.aliyun.com/articles/719102)：介绍了使用 Fun Build 实现从源码到交付产物的构建过程。
  - **本地运行与调试**：关于如何本地运行、调试函数，以及介绍排查 bug 技巧的系列文章。
    - [开发函数计算的正确姿势 —— 使用 Fun Local 本地运行与调试](https://yq.aliyun.com/articles/672623)：介绍了 Fun Local 基本用法。
    - [开发函数计算的正确姿势 —— Http Trigger 本地运行调试](https://yq.aliyun.com/articles/683683): 介绍了如何使用 Fun Local 在本地运行、单步调试配置了 Http Trigger 的函数。
    - [开发函数计算的正确姿势 —— 本地运行、调试、发布 NAS 函数](https://yq.aliyun.com/articles/683684): 介绍了如何在本地运行、单步调试配置了 NAS 服务的函数。
    - [开发函数计算的正确姿势 —— Api 本地运行调试](https://yq.aliyun.com/articles/683685): 介绍了如何在通过 API 在本地运行、单步调试函数。
  - **部署**：关于如何快速部署云服务的文章。
    - [Fun Package 功能介绍](https://yq.aliyun.com/articles/719099)：介绍了如何使用 Fun Package 将代码、编译产物、静态资源等本地资源上传到 OSS。
    - [开发函数计算的正确姿势 —— 部署 API 网关](https://yq.aliyun.com/articles/689185)：介绍了如何部署 API 网关 + 函数计算应用。
    - [开发函数计算的正确姿势 —— OSS 触发器](https://yq.aliyun.com/articles/699379)：介绍了如何部署 OSS 触发器 + 函数计算应用。
    - [开发函数计算的正确姿势 —— CDN 触发器](https://yq.aliyun.com/articles/700808)：介绍了如何部署 CDN 触发器 + 函数计算应用。
    - [开发函数计算的正确姿势 —— 使用 ROS 进行资源编排](https://yq.aliyun.com/articles/719104)：介绍了如何将资源通过 ROS 的方式进行部署。
    - [开发函数计算的正确姿势 —— 使用 Fun NAS 管理 NAS 资源](https://yq.aliyun.com/articles/712700)：介绍了如何使用 Fun NAS 管理 NAS 文件以及上传本地文件到 NAS。
    - [开发函数计算的正确姿势 —— Fun 自动化 NAS 配置](https://yq.aliyun.com/articles/712693)：介绍了 Fun 自动化 NAS 配置, 可以极大的减少了用户配置 NAS 服务与函数计算的步骤。
  - **实战**：关于如何利用 init、local、install、deploy 等命令，快速开发一款 Serverless 应用的文章。
    - [开发函数计算的正确姿势 —— 爬虫](https://yq.aliyun.com/articles/672624): 通过一个实战场景，介绍了如何利用 Fun 工具从头开始开发一个 Serverless 应用。
    - [开发函数计算的正确姿势 —— 排查超时问题](https://yq.aliyun.com/articles/672627): 从一个 bug 出发，介绍了各种排查问题的技巧。
    - [一元建站-基于函数计算 + wordpress 构建 serverless 网站](https://yq.aliyun.com/articles/721594): 本文旨在通过快速部署一个 wordpress 网站到阿里云函数计算平台，来展示 serverless web 新的开发模式。
    - [开发函数计算的正确姿势——网页截图服务](https://yq.aliyun.com/articles/688927)：介绍了如何利用函数计算快速开发网页截图服务。
    - [五分钟教你如何用函数计算部署钉钉群发机器人](https://yq.aliyun.com/articles/682133)：介绍了如何利用函数计算快速搭建钉钉群发机器人。
    - [五分钟上线——函数计算 Word 转 PDF 云服务](https://yq.aliyun.com/articles/674284)：介绍了如何将 libreoffice 迁移到函数计算，并进行 word 到 pdf 的转换。
    - [用函数计算搭建微服务——云客服访客名片](https://yq.aliyun.com/articles/674378)：介绍了如何利用函数计算搭建云客服访客名片微服务。
    - [Serverless 实战 —— 快速开发一个分布式 Puppeteer 网页截图服务](https://yq.aliyun.com/articles/727915)：介绍了如何在函数计算中使用 puppeteer。
    - [函数计算部署机器学习遇到的问题和解法](https://yq.aliyun.com/articles/630289)：介绍了机器学习部署到函数计算时可能会遇到的一些问题以及相关问的解法。
    - [开发函数计算的正确姿势——借助 Ghostscript 将 PDF 转换成 JPG](https://yq.aliyun.com/articles/718747)：介绍了使用函数计算并借助 Ghostscript 进行 word 到 pdf 的转换。

- [常见问题与解答](https://github.com/aliyun/fun/blob/master/docs/usage/faq-zh.md): 使用 Fun 时的常见问题与解答。
- [更多示例](https://github.com/aliyun/fun/tree/master/examples)

## 反馈

如您在使用中遇到问题，可以在这里反馈 https://github.com/aliyun/fun/issues

## 参考

- [以函数计算作为 API 网关后端服务](https://help.aliyun.com/document_detail/54788.html)
- [函数计算](https://www.aliyun.com/product/fc)
- [API Gateway](https://www.aliyun.com/product/apigateway)
- [Fun 发布 2.0 新版本啦](https://yq.aliyun.com/articles/604490)
- [函数计算工具链新成员 —— Fun Local 发布啦](https://yq.aliyun.com/articles/672656)
- [三十分钟快速搭建 serverless 网盘服务](https://yq.aliyun.com/articles/613780)
- [Fc Docker](https://github.com/aliyun/fc-docker)

## 开源许可

The MIT License
