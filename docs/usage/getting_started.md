# Getting started

Before going ahead to develop, you would need to create a directory which contains a file named `template.yml`. The directory will act as project root directory.

We will define a series of resources in this template file. You can find the resources available to use with fun on [fun's specification document](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md).

Before using `fun`, we need to configure it first by typing `fun config` and then, following the prompts, configure `Account ID`, `Access Key Id`, `Secret Access Key` and `Default Region Name`.

After the `fun config` is completed, fun saves the configuration to the `~/.fcli/config.yaml` file in the user home directory.

Now you are ready to use the fun command. 

### Example

Here is an example. First, create a `helloworld.js` file in the project root directory:

```javascript
exports.handler = function(event, context, callback) {
  var response = {
      isBase64Encoded: false,
      statusCode: 200,
      body: 'hello world'
  };
  callback(null, response);
};
```

Then, let's configure related services. Create a `template.yml` file in the project root directory:

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

After the template file and code are written, you can use the deploy command to deploy the service, function and api gateway online.

```shell
$fun deploy

Waiting for service fc to be deployed...
service fc deploy success
Waiting for api gateway HelloworldGroup to be deployed...
    URL: GET http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/
      stage: RELEASE, deployed, version: 20180627110526681
      stage: PRE, undeployed
      stage: TEST, undeployed
api gateway HelloworldGroup deploy success
```

Open the browser to access `http://2c2c4629c42f45a1b73000dd2a8b34b2-cn-shanghai.alicloudapi.com/` to view the result.

## Configuration

In addition to configuring fun with `fun config`, you can also configure for fun with environment variables and `.env` files.

The process for using environment variables is very simple. We briefly describe the configuration of fun through `.env`.


Create a file named `.env` in the project directory with the following content:

```shell
ACCOUNT_ID=xxxxxxxx
REGION=cn-shanghai
DEFAULT_REGION=
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