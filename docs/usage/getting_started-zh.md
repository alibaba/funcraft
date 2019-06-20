# 开发使用

安装完命令行工具之后，即可开始进行代码的开发了。为了配合 fun 工具，您需要创建一个工程目录，然后在工程目录下创建一个 `template.yml` 模板文件，fun 会将该目录视为一个工程。

我们将在该模板文件中定义项目相关的信息。fun 可以定义的信息参见 [fun 的规范文档](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md)。

在使用前，我们需要先进行配置，通过键入 `fun config`，然后按照提示，依次配置 `Account ID`、`Access Key Id`、`Secret Access Key`、 `Default Region Name` 即可。

完成 config 操作后，fun 会将配置保存到用户目录下的 `.fcli/config.yaml` 文件中。

现在，我们就为使用 fun 命令做好了准备。

## 示例

下面我们用一个简单的 http 触发器示例演示 fun 如何使用。首先在项目根目录下创建一个 index.js 文件。

```javascript
var getRawBody = require('raw-body')

module.exports.handler = function (request, response, context) {    
    // get request body
    getRawBody(request, function (err, body) {
        var respBody = {
            headers: request.headers,
            url: request.url,
            path: request.path,
            queries: request.queries,
            method: request.method,
            clientIP: request.clientIP,
            body: body.toString()
        };
        
        response.setStatusCode(200);
        response.setHeader('content-type', 'application/json');
        response.send(JSON.stringify(respBody, null, 4));
    });
};
```

接下来我们配置相关服务。在项目根目录创建一个 template.yml 文件：

```yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  local-http-test:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'local invoke demo'
    nodejs8:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: index.handler
        CodeUri: './'
        Description: 'http trigger demo with nodejs8!'
        Runtime: nodejs8
      Events:
        http-test:
          Type: HTTP
          Properties:
            AuthType: ANONYMOUS
            Methods: ['GET', 'POST', 'PUT']
```

代码以及模板文件编写完成后，就可以使用 `fun deploy` 命令一键将服务部署到线上环境了:

```shell
$ fun deploy
using region: cn-shanghai
using accountId: ***********8320
using accessKeyId: ***********1EXB
using timeout: 10

Waiting for service local-http-test to be deployed...
        Waiting for function nodejs8 to be deployed...
                Waiting for packaging function nodejs8 code...
                package function nodejs8 code done
                Waiting for HTTP trigger http-test to be deployed...
                methods: GET
                url: https://1984152879328320.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/local-http-test/nodejs8/
                function http-test deploy success
        function nodejs8 deploy success
service local-http-test deploy success
```

打开浏览器访问 `https://1984152879328320.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/local-http-test/nodejs8/` 即可触发函数的执行。对于 HTTP 触发器，服务端会为 response header 中强制添加 `content-disposition: attachment` 字段，此字段会使得返回结果在浏览器中以附件的方式打开。此字段无法覆盖，使用自定义域名将不受影响。更多信息请参见 [函数计算常见问题](https://help.aliyun.com/knowledge_detail/56103.html?spm=a2c4g.11186623.6.711.117c28acEBZTtF#HTTP-Trigger-compulsory-header)。

如果想在本地单步调试、运行 http trigger 的函数，可以参考 [开发函数计算的正确姿势 —— Http Trigger 本地运行调试](https://yq.aliyun.com/articles/683683)。

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