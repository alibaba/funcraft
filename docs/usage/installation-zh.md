# 安装

本地使用 Fun 时，如果需要在本地运行、调试函数，则需要使用 fun local 子命令.

使用 fun local 子命令就需要预先安装 docker。如果不要求在本地运行、调试函数，则不需要安装 docker。

## Docker 

### 安装 Docker

#### Mac 安装 docker

可以参考官方[教程](https://store.docker.com/editions/community/docker-ce-desktop-mac?tab=description)。

如果遇到网络问题，可以下载阿里云提供的 [Docker For Mac](http://mirrors.aliyun.com/docker-toolbox/mac/docker-for-mac/stable/)。

#### Windows 安装 docker

可以参考官方[教程](https://store.docker.com/editions/community/docker-ce-desktop-windows)。

如果遇到网络问题，可以下载阿里云提供的 [Docker For Windows](http://mirrors.aliyun.com/docker-toolbox/windows/docker-for-windows/beta/)。

#### Linux 安装 docker

可以参考官方[教程](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-using-the-repository)。

如果遇到网络问题，可以通过阿里云 Docker CE 镜像源站[下载](https://yq.aliyun.com/articles/110806)。

#### [更多平台参考](https://hub.docker.com/search/?type=edition&offering=community)

### 配置镜像加速器

安装好 docker 之后，就可以使用 docker 下载镜像了。如果遇到网络问题，推荐配置 aliyun [镜像加速器](https://yq.aliyun.com/articles/29941)。

## 安装 Fun

### 通过 npm 安装 Fun

安装它的方式是通过 npm：

```shell
$ npm install @alicloud/fun -g
```

安装完成之后，会有一个 fun 命令提供使用。输入 fun 命令可以查看帮助信息：

```shell
$ fun -h

  Usage: fun [options] [command]

  The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.

  Options:

    -v, --version       output the version number
    -h, --help          output usage information

  Commands:

    config              Configure the fun
    validate [options]  Validate a fun template
    deploy              Deploy a project to AliCloud
    build               Build the dependencies
```

### 直接下载 Fun 二进制运行程序

打开 [releases](https://github.com/aliyun/fun/releases) 页面，在最新的版本中选择一个对应平台的 release 压缩包链接，点击即可直接下载。

下载到本地后，解压，即可直接使用。

### 通过 homebrew 安装 Fun

对于 Mac 系统，还可以选择使用 homebrew 安装 Fun。

```
brew tap vangie/formula 
brew install fun
```
