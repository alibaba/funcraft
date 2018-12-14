
# FAQ

## Fun Deploy

## FCINVALIDArgumentError: PUT /services/xxxxx failed with 400. requestId: xxxxx, message: VSwitch 'xxxxx' does not exist in VPC 'xxxxx'. The VSwith may not exist or the service role does not have 'vpc:DescribeVSwitchAttributes` permission.

这个问题发生在使用 `fun deploy` 部署 vpc 时：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214113413.png)

如果已经按照错误信息描述的 VSwitch 存在于 VPC 中，那么就可能时没有为服务角色添加 `AliyunECSNetworkInterfaceManagementAccess` 的权限。文档可以[参考](https://help.aliyun.com/knowledge_detail/72959.html)。

为服务角色添加权限的方法很简单，即可以直接在 template.yml 中通过 [Policies](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice) 声明：

```
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  localdemo:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'local invoke demo'
      Policies:
        - AliyunECSNetworkInterfaceManagementAccess
      VpcConfig:
        VpcId: 'vpc-j6cfu2g6tslzekh8grfmk'
        VSwitchIds: [ 'vsw-j6chkgsg9naj6gx49espd' ]
        SecurityGroupId: 'sg-j6ceitqs6ljyssm1apom'
```

指定 `Policies` 时，fun 会附加该权限到 Fun 创建的默认角色上。

也可以手动添加权限 `AliyunECSNetworkInterfaceManagementAccess` 到指定 role 上，然后将 [Role](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice) 属性配置到 template.yml 中：

```
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  localdemo:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'local invoke demo'
      Role: 'acs:ram::1911504709953557:role/customrole'
      VpcConfig:
        VpcId: 'vpc-j6cfu2g6tslzekh8grfmk'
        VSwitchIds: [ 'vsw-j6chkgsg9naj6gx49espd' ]
        SecurityGroupId: 'sg-j6ceitqs6ljyssm1apom'
```

注意，`Role` 与 `Polices` 不能同时使用，如果配置了 `Role`，则 `Polices` 会被忽略。

## Fun Local

### Error starting userland proxy: mkdir /port/tcp:0.0.0.0:80:tcp:172.17.0.2:5000: input/output error.

这个问题发生在 windows 平台上的 `docker for windows`。错误信息如下：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214112210.png)

已被确认为是一个 `docker for windows` 的 [bug](https://github.com/docker/for-win/issues/573)。

一个可行的解法是：

禁用 `Experimental Features`，并重启 `docker`。

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214112400.png)


