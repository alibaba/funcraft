# 安装

## 安装 Fun

Fun 提供了三种安装方式

* [通过 npm 包管理安装](#%e9%80%9a%e8%bf%87-npm-%e5%8c%85%e7%ae%a1%e7%90%86%e5%ae%89%e8%a3%85) —— 适合所有平台（Windows/Mac/Linux）且已经预装了 npm 的开发者。
* [通过下载二进制安装](#通过下载二进制安装) —— 适合所有平台（Windows/Mac/Linux）。
* [通过 Homebrew 包管理器安装](#%e9%80%9a%e8%bf%87-homebrew-%e5%8c%85%e7%ae%a1%e7%90%86%e5%99%a8%e5%ae%89%e8%a3%85) —— 适合 Mac 平台，更符合 MacOS 开发者习惯

### 通过 npm 包管理安装

安装它的方式是通过 npm：

```shell
$ npm install @alicloud/fun -g
```

> 如果在 Linux/MacOS 下执行报 "Error: EACCES: permission denied" 错误，请加上 `sudo` 执行：`sudo npm install @alicloud/fun -g`。

> 如果安装过程较慢，可以考虑使用淘宝 NPM 源：`npm --registry=https://registry.npm.taobao.org install @alicloud/fun -g`

安装完成之后。在控制终端输入 fun 命令可以查看版本信息：

```shell
$ fun --version
3.6.1
```

### 通过下载二进制安装

打开 [releases](https://github.com/aliyun/fun/releases) 页面，在最新的版本中选择一个对应平台的 release 压缩包链接，点击即可直接下载。

下载到本地后，解压，即可直接使用。

#### Windows 平台

1. 找到一个最新的发布版本（Release）下载 `fun-*-win.exe.zip` 文件（其中 * 表示版本号，如 v3.6.1）。
2. 解压文件 `fun-*-win.exe.zip` 得到 `fun-*.win.exe` 文件，重名为 `fun.exe`。
3. 讲 fun.exe 文件拷贝到系统 PATH 目录即可，比如：`C:\WINDOWS\System32`
4. 打开命令终端，执行 `fun.exe --version`，查看返回版本号以验证是否安装成功。

#### Linux 平台

打开 Terminal ，在 bash/zsh 中依次执行如下命令

```bash
# 设置版本，请把下面更新为 https://github.com/aliyun/fun/releases 页面的最新版本
$ FUN_VERSION="v3.6.22"

# 下载到本地
$ curl -o fun-linux.zip http://funcruft-release.oss-accelerate.aliyuncs.com/fun/fun-$FUN_VERSION-linux.zip
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 32.2M  100 32.2M    0     0  2606k      0  0:00:12  0:00:12 --:--:-- 2376k

# 解压 zip 文件
$ unzip fun-linux.zip
Archive:  fun-v3.6.1-linux.zip
  inflating: fun-v3.6.1-linux

# 移到 PATH 目录
$ mv fun-*-linux /usr/local/bin/fun

# 验证版本
$ fun --version
3.6.1
```

#### MacOS 平台

打开 Terminal ，在 bash/zsh 中依次执行如下命令

```bash
# 设置版本，请把下面更新为 https://github.com/aliyun/fun/releases 页面的最新版本
$ FUN_VERISON="v3.6.1"

# 下载到本地
$ curl -o fun-macos.zip https://gosspublic.alicdn.com/fun/fun-$FUN_VERSION-macos.zip
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 32.2M  100 32.2M    0     0  2606k      0  0:00:12  0:00:12 --:--:-- 2376k

# 解压 zip 文件
$ unzip fun-macos.zip
Archive:  fun-v3.6.1-macos.zip
  inflating: fun-v3.6.1-macos

# 移到 PATH 目录
$ mv fun-*-macos /usr/local/bin/fun

# 验证版本
$ fun --version
3.6.1
```

### 通过 Homebrew 包管理器安装

对于 Mac 系统，还可以选择使用 homebrew 安装 Fun。

```bash
brew tap vangie/formula
brew install fun
```

## 安装 Docker（可选）

如果你需要通过 Fun 进行依赖编译和安装、本地运行调试，涉及到 fun install/build/local 等命令的功能，那需要在您的开发环境下有 docker。

### Windows 平台

可以参考官方[教程](https://store.docker.com/editions/community/docker-ce-desktop-windows)。如果遇到网络问题，可以下载阿里云提供的 [Docker For Windows](http://mirrors.aliyun.com/docker-toolbox/windows/docker-for-windows/beta/)。

### MacOS 平台

可以参考官方[教程](https://store.docker.com/editions/community/docker-ce-desktop-mac?tab=description)。如果遇到网络问题，可以下载阿里云提供的 [Docker For Mac](http://mirrors.aliyun.com/docker-toolbox/mac/docker-for-mac/stable/)。

### Linux 平台

可以参考官方[教程](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-using-the-repository)。如果遇到网络问题，可以通过阿里云 Docker CE 镜像源站[下载](https://yq.aliyun.com/articles/110806)。

### [更多平台参考](https://hub.docker.com/search/?type=edition&offering=community)

### 配置 docker 镜像加速器

安装好 docker 之后，就可以使用 docker 下载镜像了。如果遇到网络问题，推荐配置 aliyun [镜像加速器](https://yq.aliyun.com/articles/29941)。

# 配置

在第一次使用 fun 之前需要先执行 fun config 进行配置，按照提示，依次配置 `Account ID`、`Access Key Id`、`Secret Access Key`、 `Default Region Name` 即可。其中 `Account ID`、`Access Key Id` 你可以从[函数计算控制台](https://fc.console.aliyun.com)首页的右上方获得，如下图所示。

![](https://img.alicdn.com/tfs/TB13J02wp67gK0jSZPfXXahhFXa-2424-1380.png)
![](https://img.alicdn.com/tfs/TB1cYuGwuH2gK0jSZJnXXaT1FXa-2424-1380.png)
