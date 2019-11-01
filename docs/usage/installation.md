# Installation

When using Fun, if you need to run and debug function locally, you need to use the fun local subcommand.

Fun local subcommand depend on docker.

If you don't want to run and debug function locally, docker is not required.

## Docker

### Install Docker

#### Install Docker On Mac

You can refer to the official [Tutorial](https://store.docker.com/editions/community/docker-ce-desktop-mac?tab=description).

If you encounter network problems, you can download [Docker For Mac](http://mirrors.aliyun.com/docker-toolbox/mac/docker-for-mac/stable/) provided by Alibaba Cloud.

#### Install Docker On Windows

You can refer to the official [Tutorial](https://store.docker.com/editions/community/docker-ce-desktop-windows).

If you encounter network problems, you can download [Docker For Windows](http://mirrors.aliyun.com/docker-toolbox/windows/docker-for-windows/stable/) provided by Alibaba Cloud.

#### Install Docker On Linux

You can refer to the official [Tutorial](https://docs.docker.com/install/linux/docker-ce/ubuntu).

If you encounter network problems, you can use Alibaba Cloud Docker CE mirror to download. please refer to this [tutorial](https://yq.aliyun.com/articles/110806).

#### [More platform references](https://hub.docker.com/search/?type=edition&offering=community)

### Configuring Docker Registry Mirror

Once docker is installed, you can use docker to download the image. If you encounter network problems, it is recommended to configure aliyun [Registry Mirror](https://yq.aliyun.com/articles/29941).

## Install Fun Using Npm

Fun could be installed by [npm](https://www.npmjs.com/):

```shell
$ npm install @alicloud/fun -g
```

A fun command is available after a successful installation. Typing `fun` in the console will print usage:

```shell
$ fun

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

## Install Fun by Downloading The Latest Binary

Open the [Releases](https://github.com/aliyun/fun/releases) page, click a link of the corresponding platform to download the Fun zip package.

After downloading, unzip it and use it directly.

## Install Fun Using Homebrew

For Mac, you can also install Fun using homebrew.

```
brew tap vangie/formula 
brew install fun
```