## Spring Boot template for Custom Runtime

### 初始化

```bash
fun init custom-springboot
```

### 本地运行

```bash
$ ./mvnw package && fun local start

...

using template: template.yml
http trigger httpTrigger of springboot/helloworld was registered
        url: http://localhost:8000/2016-08-15/proxy/springboot/helloworld/
        methods: GET,POST,PUT
        authType: ANONYMOUS


function compute app listening on port 8000!
```

使用浏览器打开 http://localhost:8000/2016-08-15/proxy/springboot/helloworld/ ， 显示包含“Hello, World!”的页面。

### 部署

```bash
$ fun deploy
using template: template.yml
            using region: cn-shanghai
            using accountId: ***********4733
            using accessKeyId: ***********EUz3
            using timeout: 60

            Waiting for service springboot to be deployed...
                    Waiting for function helloworld to be deployed...
                            Waiting for packaging function helloworld code...
                            The function helloworld has been packaged. A total of 3 files files were compressed and the final size was 14.32 MB
                            Waiting for HTTP trigger httpTrigger to be deployed...
                            methods: GET,POST,PUT
                            url: https://1751705494334733.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/springboot/helloworld/
                            function httpTrigger deploy success
                    function helloworld deploy success
            service springboot deploy success
```

使用浏览器打开上面的网址 https://1751705494334733.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/springboot/helloworld/，会下载一个 html 页面到本地，打开该下载的页面会显示“Hello, World!”。

如果不希望下载页面，可以为该函数绑定一个[自定义域名](https://help.aliyun.com/document_detail/90722.html)。

