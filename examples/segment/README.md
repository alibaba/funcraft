# 基于函数计算和 API 网关的分词服务

之所以将本 segement 模块通过函数计算来实现，是因为 segement 模块是一个很耗内存的模块，会增加 Node.js 运行期间的 GC 负载。

通过函数计算和 API 网关实现之后，可以将该模块的内存与业务相隔离，减小内存的开销。

缺点：原来的同步调用，变成远程网络调用。
优点：不影响业务代码的 GC 效率，动态扩容。

## 部署

```sh
$ fun deploy
```

调用部署前，请设置 ACCESS_KEY_ID/ACCESS_KEY_SECRET/ACCOUNT_ID 环境变量。

## 测试

调用测试：

```sh
curl -v -H "Content-Type:application/json" -X POST --data c3b42de88cc11dd6842c617-cn-hangzhou.alicloudapi.com/do_segement
```

## License

The MIT license
