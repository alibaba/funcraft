# Spring boot gradle demo

这个工程可用于演示如何将基于 Gradle 进行构建的项目部署到阿里云函数计算中.

# 使用方式

运行以下命令前请确保您已安装 [Funcraft](https://github.com/alibaba/funcraft),
并已[配置好 fun 命令行工具](https://help.aliyun.com/document_detail/146702.html).

### 运行

直接运行: `gradle :bootRun`

在函数计算沙盒环境中运行: `fun local start` ( 需要 [Docker](https://www.docker.com/) )

### 构建产物

```
gradle :bootJar
```

构建完成的产物将位于 /build/libs 目录下.

### 部署

```
fun deploy -y
```

部署完成后, 您可以前往 [函数计算控制台](https://fc.console.aliyun.com/) 查看已部署的函数.
