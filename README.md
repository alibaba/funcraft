# fun

(have)Fun with Serverless

![logo.jpg](./logo.jpg)

[fun](https://github.com/aliyun/fun) 是一个用于支持 Serverless 应用部署的工具，能帮助您便捷地管理函数计算、API 网关、日志服务等资源。它通过一个资源配置文件（template.yml），协助您进行开发、构建、部署操作。

如果您想要使用旧版语法，请[参考](./README.old.md)。

## 安装

fun 是一个 Node.js 编写的命令行工具，但它也能支持 Python，Java 等环境的部署操作。安装它的方式是通过 npm：

```
$ npm install @alicloud/fun -g
```

安装完成之后，会有一个 fun 命令提供使用。输入 fun 命令可以查看帮助信息：

```
$ fun -h

  Usage: fun [options] [command]

  The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.

  Options:

    -v, --version       output the version number
    -h, --help          output usage information

  Commands:

    config              Configure the fun
    validate [options]  Validate a fun template
    deploy [stage]      Deploy a project to AliCloud
    build               Build the dependencies
```

## 使用

安装完命令行工具之后，即可开始进行代码的开发了。为了配合 fun 工具，您需要创建一个工程目录，然后在工程目录下创建一个 `template.yml` 模板文件，fun 会将该目录视为一个工程。

我们将在该模板文件中定义项目相关的信息。fun 可以定义的信息参见 [fun 的规范文档](https://github.com/aliyun/fun/blob/spec_for_ros/docs/specs/2018-04-03-zh-cn.md)。

在使用前，我们需要先进行配置，通过键入 `fun config`，然后按照提示，依次配置 `Account ID`、`Access Key Id`、`Secret Access Key`、 `Default Region Name` 即可。

完成 config 操作后，fun 会将配置保存到用户目录下的 `.fcli/config.yaml` 文件中。

配置完成后，就可以使用 fun 命令了，模板文件、代码编写完成后，通过 fun deploy 就可以一键将服务部署到线上环境了。

## 示例

下面我们一个示例来演示 fun 如何使用。首先在项目根目录下创建一个 hello.js 文件。

```
exports.handler = function(event, context, callback) {
  var response = {
      isBase64Encoded: false,
      statusCode: 200,
      body: 'hellow wrold'
  };
  callback(null, response);
};
```

接下来我们配置相关服务。在项目根目录创建一个 template.yml 文件：

```
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  fc: # service name
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'fc test'
    helloworld: # function name
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: helloworld.handler
        Runtime: nodejs8
        CodeUri: './'
        Timeout: 60

  HelloworldGroup: # Api Group
    Type: 'Aliyun::Serverless::Api'
    Properties:
      StageName: RELEASE
      DefinitionBody:
        '/': # request path
          get: # http method
            x-aliyun-apigateway-api-name: hello_get # api name
            x-aliyun-apigateway-fc:
              arn: acs:fc:::services/${fc.Arn}/functions/${helloworld.Arn}/    
```

最后执行 `fun deploy` 即可看到成功的信息：

```
Waiting for service fc to be deployed...
service fc deploy success
Waiting for api gateway HelloworldGroup to be deployed...
    URL: GET http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/
      => undefined
      stage: RELEASE, deployed, version: 20180627110526681
      stage: PRE, undeployed
      stage: TEST, undeployed
api gateway HelloworldGroup deploy success
```

打开浏览器访问 `http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/` 这个地址即可。

## 配置

除了使用 `fun config` 对 fun 进行配置外，还可以通过环境变量以及 .env 为 fun 进行配置。

环境变量的方式很简单，这里简单说下 .env 的方式，在项目根下创建一个名为 .env 的文件，录入以下配置即可：

```
ACCOUNT_ID=xxxxxxxx
REGION=cn-shanghai
ACCESS_KEY_ID=xxxxxxxxxxxx
ACCESS_KEY_SECRET=xxxxxxxxxx
```

建议将 .env 放到 .gitignore 中，避免泄漏重要的账户信息。

### 配置的优先级

fun 配置方式的优先级按以下顺序依次递减：

- .env
- 环境变量
- ~/.fcli/config.yaml

## 更多例子

更复杂的例子可以从这里查看：

https://github.com/aliyun/fun/tree/master/examples

## 反馈

如您在使用中遇到问题，可以在这里反馈 https://github.com/aliyun/fun/issues

## 参考

- [以函数计算作为 API 网关后端服务](https://help.aliyun.com/document_detail/54788.html)
- [函数计算](https://www.aliyun.com/product/fc)
- [API Gateway](https://www.aliyun.com/product/apigateway)

## 开源许可

The MIT License
