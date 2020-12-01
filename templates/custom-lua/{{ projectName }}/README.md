## Lua template for Custom Runtime

### Deploy

```bash
➜  lua-demo fun deploy -y
using template: template.yml
using region: cn-shanghai
using accountId: ***********3743
using accessKeyId: ***********Ptgk
using timeout: 60

Collecting your services information, in order to caculate devlopment changes...

Resources Changes(Beta version! Only FC resources changes will be displayed):

┌──────────┬──────────────────────────────┬────────┬──────────┐
│ Resource │ ResourceType                 │ Action │ Property │
├──────────┼──────────────────────────────┼────────┼──────────┤
│ fc-lua   │ Aliyun::Serverless::Function │ Modify │ CodeUri  │
└──────────┴──────────────────────────────┴────────┴──────────┘

Waiting for service lua-demo to be deployed...
	Waiting for function fc-lua to be deployed...
		Waiting for packaging function fc-lua code...
		The function fc-lua has been packaged. A total of 7 files were compressed and the final size was 10.61 MB
	function fc-lua deploy success
service lua-demo deploy success
```

### Invoke

```bash
➜  lua-demo fun invoke -e "Hello World"
using template: template.yml

Missing invokeName argument, Fun will use the first function lua-demo/fc-lua as invokeName

========= FC invoke Logs begin =========
FC Invoke Start RequestId: b204c3a8-7b26-4d0f-b9ad-83328c6a9ac8, client: 21.0.3.254, server: , request: "POST /invoke HTTP/1.1", host: "21.0.3.3:9000"
2020/12/01 06:26:28 [notice] 7#7: *2 [lua] main.lua:17: FC Invoke End RequestId: b204c3a8-7b26-4d0f-b9ad-83328c6a9ac8, client: 21.0.3.254, server: , request: "POST /invoke HTTP/1.1", host: "21.0.3.3:9000"
21.0.3.3 21.0.3.254 0.000 [01/Dec/2020:06:26:28 +0000] "POST /invoke HTTP/1.1" 200 22 "-" "Go-http-client/1.1" "-" b204c3a8-7b26-4d0f-b9ad-83328c6a9ac8
Duration: 1.61 ms, Billed Duration: 100 ms, Memory Size: 512 MB, Max Memory Used: 12.14 MB
========= FC invoke Logs end =========

FC Invoke Result:
Hello World
```