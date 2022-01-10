# 函数计算 python 项目模板

## 安装第三方包(可选)

如果需要第三方包依赖， 修改 composer.json, 增加自己想要的依赖，然后执行 fun build 完成第三方依赖安装

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

比如您安装的一个第三方包依赖底层的 so 库， 但是函数计算的直接环境没有内置这个底层 so 库， 比如您安装的 xx 第三方 php 库依赖 libzbar0, 只需要在当前目录执行

```bash
fun install --runtime php7.2 --package-type apt libzbar0
```

[使用 fun install 安装第三方依赖](https://help.aliyun.com/document_detail/146967.html)

### 第三方扩展

- [PHP 自定义扩展](https://help.aliyun.com/document_detail/89032.html?spm=a2c4g.11186623.6.582.7f75eeafxVsUSp#title-5is-tf3-b5o)

- [函数计算 php runtime 编译非内置的扩展](https://developer.aliyun.com/article/686367?spm=a2c4g.11186623.2.2.11a9390aZI7GWx)
