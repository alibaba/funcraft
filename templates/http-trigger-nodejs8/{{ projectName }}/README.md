# 函数计算 python 项目模板

## 安装第三方包(可选)

如果需要第三方包依赖， 修改 package.json, 增加自己想要的依赖，然后执行 fun build 完成第三方依赖安装

```bash
fun build --use-docker
```

## 本地运行

```bash
fun local invoke
```

## 部署

```bash
fun deploy
```

## 附录参考(可选)

### 部署到其他账户或者 region

比如切换 region 部署， 只需要

```bash
export REGION=cn-shanghai
```

[改变部署 region 或者账号](https://help.aliyun.com/document_detail/146702.html#section-o23-iw0-hfk)

### 更加复杂的第三方包安装

比如您安装的一个第三方包依赖底层的 so 库， 但是函数计算的直接环境没有内置这个底层 so 库， 比如您安装的 xx 第三方 nodejs 库依赖 libzbar0, 只需要在当前目录执行

```bash
fun install --runtime nodejs8 --package-type apt libzbar0
```

[使用 fun install 安装第三方依赖](https://help.aliyun.com/document_detail/146967.html)
