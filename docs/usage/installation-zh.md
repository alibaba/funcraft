# Installation


fun 是一个 Node.js 编写的命令行工具，但它也能支持 Python，Java 等环境的部署操作。安装它的方式是通过 npm：

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