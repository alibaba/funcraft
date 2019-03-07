# 函数计算 Java 项目模板

## 本地运行

```bash
mvn package && fun local invoke {{ projectName }}
```

## 部署

```bash
mvn package && fun deploy
```

## 执行

```bash
fcli function invoke -s {{ projectName }} -f {{ projectName }}
```