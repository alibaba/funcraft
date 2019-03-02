
# FAQ

## Fun Deploy

### NoPermissionError: You are not authorized to do this action. Resource: acs:ram:*:xxxxxxxxxx:role/* Action: ram:GetRole

这个问题是由于通过子用户执行 `fun deploy`，但是没有给该子用户配置 AliyunRAMFullAccess 权限导致的。

解决方法：为子用户配置 AliyunRAMFullAccess 的权限或者使用主账户 ak。

### FCAccessDeniedError: GET /services/localdemo failed with 403. requestid: a73f4640-0c8d-958c-c248-db0cc70d834e, message: The service or function doesn't belong to you

这个问题发生在 fun deploy 时配置的 accountId 与 accessKeyId 不匹配：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181229150556.png)

有可能是写成了其他人的 accountId，也有可能是将登录名误认为是 accountId。

### FCINVALIDArgumentError: PUT /services/xxxxx failed with 400. requestId: xxxxx, message: VSwitch 'xxxxx' does not exist in VPC 'xxxxx'. The VSwith may not exist or the service role does not have 'vpc:DescribeVSwitchAttributes` permission.

这个问题发生在使用 `fun deploy` 部署配置了 vpc 的函数：

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214113413.png)

如果已经确认错误提示中的 VSwitch 存在于 VPC 中，那么就可能是因为没有为服务角色添加 `AliyunECSNetworkInterfaceManagementAccess` 的权限。文档可以[参考](https://help.aliyun.com/knowledge_detail/72959.html)。

为服务角色添加权限的方法很简单，可以直接在 template.yml 中通过 [Policies](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice) 声明：

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

指定 `Policies` 时，Fun 会附加该权限到 Fun 创建的默认角色上。

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


