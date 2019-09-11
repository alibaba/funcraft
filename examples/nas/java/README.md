# 函数计算  Java NAS 示例模板

该项目支持将第三方 jar 包存放在 NAS 网盘，以支持大于 50 M 的 Java 项目。

## 工作原理

Entrypoint.java 是入口函数，如果更名请同步更改 template.yml 文件。Entrypoint.java 类包含一个 ChildFirstURLClassLoader 内部类，该类负责装载 /mnt/auto/lib 目录下的 .jar 和 .class 文件。

AppProxy.java 类负责将 ContextLoader 设定为 ChildFirstURLClassLoader，改类负责装载正在的业务类 App.java。

App.java 是用户真实需要编写业务的类。


## 本地运行

```bash
mvn package && fun local invoke
```

## 部署

```bash
mvn package && fun nas sync && fun deploy
```

## 调用

```bash
fun invoke java
```