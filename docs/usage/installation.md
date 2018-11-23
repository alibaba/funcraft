# Installation

Fun is a command line tool developed for Node.js, however it also support Python, Java or other runtime enviroments. It can be installed by [npm](https://www.npmjs.com/):

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
