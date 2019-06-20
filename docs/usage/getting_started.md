# Getting started

Before going ahead to develop, you would need to create a directory which contains a file named `template.yml`. The directory will act as project root directory.

We will define a series of resources in this template file. You can find the resources available to use with fun on [fun's specification document](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md).

Before using `fun`, we need to configure it first by typing `fun config` and then, following the prompts, configure `Account ID`, `Access Key Id`, `Secret Access Key` and `Default Region Name`.

After the `fun config` is completed, fun saves the configuration to the `~/.fcli/config.yaml` file in the user home directory.

Now you are ready to use the fun command. 

### Example

Here is an example. First, create a `index.js` file in the project root directory:

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

Then, let's configure related services. Create a `template.yml` file in the project root directory:

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

After the template file and code are written, you can use the deploy command to deploy the service, function and api gateway online.

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
Open the browser and visit `https://1984152879328320.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/local-http-test/nodejs8/` to trigger the execution of the function. For HTTP triggers, server will add a `content-disposition: attachment` header in the response headers by force, which will cause the browser to download response content as an attachment. This header cannot be overwritten, and using custom domain can avoid this header being added. For more information, please refer to [FAQ](https://help.aliyun.com/knowledge_detail/56103.html?spm=a2c4g.11186623.6.711.117c28acEBZTtF#HTTP-Trigger-compulsory-header).

If you want to debug and run HTTP trigger functions locally, you can refer to [开发函数计算的正确姿势 —— Http Trigger 本地运行调试](https://yq.aliyun.com/articles/683683).

## Configuration

In addition to configuring fun with `fun config`, you can also configure for fun with environment variables and `.env` files.

The process for using environment variables is very simple. We briefly describe the configuration of fun through `.env`.


Create a file named `.env` in the project directory with the following content:

```shell
ACCOUNT_ID=xxxxxxxx
REGION=cn-shanghai
ACCESS_KEY_ID=xxxxxxxxxxxx
ACCESS_KEY_SECRET=xxxxxxxxxx
TIMEOUT=10
RETRIES=3
```

It is recommended to add the `.env` into `.gitignore` file to prevent your account credentials from being checked into code repository.

### Configuring Priority

The priority of the fun configuration is decremented in the following order：

- .env
- environment variables
- ~/.fcli/config.yaml

### .funignore

Create a .funignore file in the same directory as template.yml. When packaging the zip file, you can exclude the files or folders described in .funignore. such as:

```
# Logs
logs/
*.log
 
# Dependency directories
node_modules/
!bb/node_modules
```

The logs/ directory and *.log files are ignored when packaging. The node_modules/ directory of all levels will be ignored, but bb/node_modules is preserved.

.funignore follows the syntax of .gitignore.

## More examples

You can find more complex examples here:

- https://github.com/aliyun/fun/tree/master/examples
- [十分钟上线-在函数计算上部署基于django开发的个人博客系统](https://yq.aliyun.com/articles/603249?spm=a2c4e.11153959.teamhomeleft.26.115948f26ECqbQ)