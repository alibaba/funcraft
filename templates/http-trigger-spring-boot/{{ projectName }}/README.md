# 函数计算 SpringBoot 模板项目

## 前言

首先介绍下在本文出现的几个比较重要的概念：

> **函数计算（Function Compute）**: 函数计算是一个事件驱动的服务，通过函数计算，用户无需管理服务器等运行情况，只需编写代码并上传。函数计算准备计算资源，并以弹性伸缩的方式运行用户代码，而用户只需根据实际代码运行所消耗的资源进行付费。函数计算更多信息 [参考](https://help.aliyun.com/product/50980.html)。<br />
**Fun**: Fun 是一个用于支持 Serverless 应用部署的工具，能帮助您便捷地管理函数计算、API 网关、日志服务等资源。它通过一个资源配置文件（template.yml），协助您进行开发、构建、部署操作。Fun 的更多文档 [参考](https://github.com/alibaba/funcraft)。	<br />
**ROS**: 阿里云资源编排服务（ROS）助您简化云计算资源的管理。您可以遵循ROS定义的模板规范，在模板中定义所需云计算资源的集合及资源间依赖关系。ROS自动完成所有资源的创建和配置，实现自动化部署和运维。更多文档[参考](https://help.aliyun.com/product/28850.html)。


**备注: 本文介绍的技巧需要 Fun 版本大于等于 3.0.8。**

## 环境准备

首先按照 Fun 的[安装文档](https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md)里介绍的方法将 Fun 安装到本机。

安装完成后，可以执行 `fun --version` 检查 Fun 是否安装成功。

## 快速部署

### 1.初始化项目

通过 [fun init](https://yq.aliyun.com/articles/674363) 可以进行项目的初始化：

```shell
fun init -n SpringBootDemo
```

执行完毕，会在当前目录多出来一个名为 SpringBootDemo 的目录。

执行效果如下：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/fun-spirng-boot-init.gif)

### 2. 本地编译

通过 [fun build](https://yq.aliyun.com/articles/719102) 可以对项目进行编译构建：

```
fun build
```

执行效果如下：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/fun-spirng-boot-build.gif)

### 3. 本地运行

**备注：如果不需要本地运行，可以跳过这步**

通过 [fun local start](https://yq.aliyun.com/articles/683683) 可以在本地运行函数。

执行以下命令：

```
fun local start demo-springboot
```

可以看到效果：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/fun-spirng-boot-local-start.gif)

### 4. 本地单步调试

**备注：如果不需要本地单步调试，可以跳过这步**


通过 [fun local start](https://yq.aliyun.com/articles/683683) 也可以在本地单步调试函数。

**无论是 VSCode，还是 IDEA，均已提供函数计算运行、调试的支持，可以分别参考 VSCode 插件 [serverless-vscode](https://github.com/alibaba/serverless-vscode)，以及 IDEA 插件 [Cloud Toolkit](https://www.aliyun.com/product/cloudtoolkit)。**

考虑到读者受众，这里我们不借助插件进行调试，更详调试细节请参考：https://yq.aliyun.com/articles/683683

操作效果如下：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/fun-spirng-boot-local-debug.gif)

### 5. 打包部署

接下来，我们使用 [fun deploy --use-ros](https://yq.aliyun.com/articles/719104) 的方式通过 ROS 进行部署：

```
fun package --oss-bucket fun-local-test
fun deploy --use-ros --stack-name staging
```

其中，这里的 `--oss-bucket` 名称为自己所拥有读写权限的 oss 的 Bucket 名称。

`--stack-name` 表示要部署的环境，可以基于该名称的不同，建立多套开发环境，比如 test、staging、prod。

我们下面演示如何快速创建一个 staging 环境，执行效果如下：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/fun-spirng-boot-deploy.gif)

测试完成后，可以登陆 [ROS 控制台](https://ros.console.aliyun.com)，一键删除刚才创建的 staging 资源栈，这样，这个栈所包含的所有资源就都会被删除了。

## 参考阅读

1. [Funcraft](https://github.com/alibaba/funcraft)
2. [ROS](https://ros.console.aliyun.com)
3. [VSCode](https://github.com/alibaba/serverless-vscode)
4. [CloudToolkit](https://www.aliyun.com/product/cloudtoolkit)
