# Fun

(have)Fun with Serverless

![logo.jpg](./logo.jpg)

[中文文档](README-zh.md)

[Fun](https://github.com/aliyun/fun) is a tool for supporting the deployment of Serverless applications and can help you easily manage resources such as Function Compute, API Gateways, Log Serivce, and so on. It assists you with development, build, and deployment operations through a resource configuration file (template.yml).

If you want to use the old syntax, please refer to [README.old.md](./README.old.md).

## Installation

Fun is a command-line tool written in Node.js, but it can also support the deployment of Python, Java and other environments. The easiest way to install `Fun` is to use [npm](https://www.npmjs.com/):

```
$ npm install @alicloud/fun -g
```

After the installation is complete, a `fun` command is provided for use. Enter `fun` command to see help information:

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

## Usage

Once you have installed the command line tools, you are ready to write code. In order to use fun tool, you need to create a project directory and then create a file named template.yml in the project directory. Fun will treat the directory as a project.

We will define a series of resources in this template file. Resources that can be defined by fun can be found on [fun's specification document](https://github.com/aliyun/fun/blob/spec_for_ros/docs/specs/2018-04-03.md).

However before useing `fun`, we need to configure it first by typing `fun config` and then following the prompts, configure `Account ID`, `Access Key Id`, `Secret Access Key` and `Default Region Name`.

After the `fun config` is completed, fun saves the configuration to the `.fcli/config.yaml` file in the user home.

Now you are ready to use the fun command. 

### Example

Here is an example to demonstrate how fun is used. First create a hello.js file in the project root directory.

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

Next we configure related services. Create a template.yml file in the project root directory:

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

After the template file and code are written, you can use the deploy command to deploy the service, function and api gateway to online.

```
$fun deploy

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

Open the browser to access `http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/` to view the result.

## Configuration

In addition to configuring fun with `fun config`, you can also configure for fun with environment variables and `.env`.

The way of using environment variables is very simple. We briefly describe the configuration of fun through `.env`.


Create a file named `.env` in the project directory with the following content:

```
ACCOUNT_ID=xxxxxxxx
REGION=cn-shanghai
ACCESS_KEY_ID=xxxxxxxxxxxx
ACCESS_KEY_SECRET=xxxxxxxxxx
```

It is recommended that put the `.env` file into `.gitignore` to protect your acouunt credentials from leaking into the public network environment.

### Configuring Priority

The priority of the fun configuration is decremented in the following order：

- .env
- environment variables
- ~/.fcli/config.yaml

## More examples

You can find more complicated examples here:

https://github.com/aliyun/fun/tree/master/examples

## Referrences

- [以函数计算作为 API 网关后端服务](https://help.aliyun.com/document_detail/54788.html)
- [函数计算](https://www.aliyun.com/product/fc)
- [API Gateway](https://www.aliyun.com/product/apigateway)

## License

The MIT License