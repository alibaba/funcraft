## Dart template for Custom Runtime

### Deploy

```bash
➜  dart-demo make deploy
docker run --rm -it -v $(pwd):/tmp google/dart:2.8.4 bash -c "export PUB_HOSTED_URL=https://pub.flutter-io.cn && cd tmp/code && dart2native index.dart && mv index.exe bootstrap"
Generated: /tmp/code/index.exe
chmod +x code/bootstrap
fun deploy -y
using template: template.yml
using region: cn-shanghai
using accountId: ***********3743
using accessKeyId: ***********Ptgk
using timeout: 60

Collecting your services information, in order to caculate devlopment changes...

Resources Changes(Beta version! Only FC resources changes will be displayed):

┌───────────┬──────────────────────────────┬────────┬──────────────────────┐
│ Resource  │ ResourceType                 │ Action │ Property             │
├───────────┼──────────────────────────────┼────────┼──────────────────────┤
│           │                              │        │ CodeUri              │
│ dart-func │ Aliyun::Serverless::Function │ Modify ├──────────────────────┤
│           │                              │        │ EnvironmentVariables │
└───────────┴──────────────────────────────┴────────┴──────────────────────┘

Waiting for service dart-demo to be deployed...
	Waiting for function dart-func to be deployed...
		Waiting for packaging function dart-func code...
		The function dart-func has been packaged. A total of 2 files were compressed and the final size was 2.57 MB
	function dart-func deploy success
service dart-demo deploy success
```

### Invoke
```bash
➜  dart-demo make invoke
fun invoke
using template: template.yml

Missing invokeName argument, Fun will use the first function dart-demo/dart-func as invokeName

========= FC invoke Logs begin =========
FC Invoke Start RequestId: feae9f42-1da9-4864-8a11-efc445a2844b
hello world
FC Invoke End RequestId: feae9f42-1da9-4864-8a11-efc445a2844b

Duration: 1.07 ms, Billed Duration: 100 ms, Memory Size: 1024 MB, Max Memory Used: 21.46 MB
========= FC invoke Logs end =========

FC Invoke Result:
```