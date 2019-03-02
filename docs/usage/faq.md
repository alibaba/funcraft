
# FAQ

## Fun Deploy

### NoPermissionError: You are not authorized to do this action. Resource: acs:ram:*:xxxxxxxxxx:role/* Action: ram:GetRole

This problem is caused by executing `fun deploy` through the sub-user withouting grant the AliyunRAMFullAccess permission for sub-user.

The solution is to grant the AliyunRAMFullAccess permission for the sub-user or use the primary account ak.

### FCAccessDeniedError: GET /services/localdemo failed with 403. requestid: a73f4640-0c8d-958c-c248-db0cc70d834e, message: The service or function doesn't belong to you

This problem occurs when fun deploy is configured with an accountId that does not match the accessKeyId:

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181229150556.png)

It is possible to write someone else's accountId or mistake the username for accountId.

### FCInvalidArgumentError: PUT /services/xxxxx failed with 400. requestId: xxxxx, message: VSwitch 'xxxxx' does not exist in VPC 'xxxxx'. The VSwith may not exist or the service role does not have 'vpc:DescribeVSwitchAttributes` permission.

This problem occurs when deploying vpc with `fun deploy`:

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214113413.png)

If the VSwitch exists in the VPC as described in the error message, the reason for the problem is that the correct permission `AliyunECSNetworkInterfaceManagementAccess` are not added for the service role. [reference](https://www.alibabacloud.com/help/doc-detail/72959.htm).


The way to add permissions to a service role is simple. 

You can use [Policies](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md#aliyunserverlessservice) directly in template.yml:

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

When `Policies` is specified, fun will append this permission to the default role created by Fun.

You can also manually add `AliyunECSNetworkInterfaceManagementAccess` to the specified role and then configure the [Role](https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md#aliyunserverlessservice) property in template.yml:

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

Note that `Role` and `Polices` cannot be used at the same time. If `Role` is configured, `Polices` will be ignored.

## Fun Local

### Error starting userland proxy: mkdir /port/tcp:0.0.0.0:80:tcp:172.17.0.2:5000: input/output error.

This problem occurs with `docker for windows` on the Windows platform. The error message is as follows:

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214112210.png)

It has been confirmed as a [bug](https://github.com/docker/for-win/issues/573) with `docker for windows`.

This can be as a workaround:

Disabling "Experimental Features" in the Settings/Daemon menu, and then restarting docker.

![](https://tan-blog.oss-cn-hangzhou.aliyuncs.com/img/20181214112400.png)



