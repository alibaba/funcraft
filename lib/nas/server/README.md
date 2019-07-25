
# demo

## 准备

1. 安装 node

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash
nvm install 8
```

## 安装依赖

```bash
npm install
```

## 编译

```bash
# 生成编译
npm run build

# 开发编译（这种编译方式不会进行代码混淆，并且生成 source map 信息，方便开发调试）
npm run dev
```

## 本地运行函数

```bash
fun local start
```

## 运行调试函数


运行调试之前，请先用 npm run dev  命令编译源码，然后以调试的方式运行函数：
```bash
fun local start -d 3000
```

如下图所示：
![debug-fc-http.gif](https://i.loli.net/2019/05/21/5ce357e0c411644090.gif)


## 部署函数到云端

```bash
fun deploy
```