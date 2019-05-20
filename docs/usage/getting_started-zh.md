# 开发使用

安装完命令行工具之后，即可开始进行代码的开发了。为了配合 fun 工具，您需要创建一个工程目录，然后在工程目录下创建一个 `template.yml` 模板文件，fun 会将该目录视为一个工程。

我们将在该模板文件中定义项目相关的信息。fun 可以定义的信息参见 [fun 的规范文档](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md)。

在使用前，我们需要先进行配置，通过键入 `fun config`，然后按照提示，依次配置 `Account ID`、`Access Key Id`、`Secret Access Key`、 `Default Region Name` 即可。

完成 config 操作后，fun 会将配置保存到用户目录下的 `.fcli/config.yaml` 文件中。

现在，我们就为使用 fun 命令做好了准备。

## 示例

下面我们用一个简单的 helloworld 示例演示 fun 如何使用。首先在项目根目录下创建一个 helloworld.js 文件。

```javascript
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

```yaml
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

代码以及模板文件编写完成后，就可以使用 `fun deploy` 命令一键将服务部署到线上环境了:

```shell
$ fun deploy

Waiting for service fc to be deployed...
service fc deploy success
Waiting for api gateway HelloworldGroup to be deployed...
    URL: GET http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/
      stage: RELEASE, deployed, version: 20180627110526681
      stage: PRE, undeployed
      stage: TEST, undeployed
api gateway HelloworldGroup deploy success
```

打开浏览器访问 `http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/` 这个地址即可预览效果。

## 配置

除了使用 `fun config` 对 fun 进行配置外，还可以通过环境变量以及 .env 为 fun 进行配置。

环境变量的方式很简单，这里简单说下 .env 的方式，在项目根下创建一个名为 .env 的文件，录入以下配置即可：

```shell
ACCOUNT_ID=xxxxxxxx
REGION=cn-shanghai
ACCESS_KEY_ID=xxxxxxxxxxxx
ACCESS_KEY_SECRET=xxxxxxxxxx
TIMEOUT=10
RETRIES=3
```

建议将 .env 放到 .gitignore 中，避免泄漏重要的账户信息。

### 配置的优先级

fun 配置方式的优先级按以下顺序依次递减：

- .env
- 环境变量
- ~/.fcli/config.yaml

### .funignore

在 template.yml 所在的目录放置一个 .funignore 文件，打包 zip 文件的时候可以排除掉 .funignore 内描述的文件或者文件夹。 例如：

```
# Logs
logs/
*.log
 
# Dependency directories
node_modules/
!bb/node_modules
```

打包时会忽略 logs/ 目录 、*.log 文件。所有层级的 node_modules/ 目录会被忽略，但是 bb/node_modules 会被保留。

.funignore 遵从 .gitignore 的语法。

## 更多示例

下面有更多的示例：

- https://github.com/aliyun/fun/tree/master/examples
- [十分钟上线-在函数计算上部署基于django开发的个人博客系统](https://yq.aliyun.com/articles/603249?spm=a2c4e.11153959.teamhomeleft.26.115948f26ECqbQ)