## Ruby template for Custom Runtime

### Deploy

```bash
➜  ruby-demo fun deploy -y
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
│ ruby-demo │ Aliyun::Serverless::Service  │ Add    │ Description          │
├───────────┼──────────────────────────────┼────────┼──────────────────────┤
│           │                              │        │ Handler              │
│           │                              │        ├──────────────────────┤
│           │                              │        │ Runtime              │
│           │                              │        ├──────────────────────┤
│ fc-ruby   │ Aliyun::Serverless::Function │ Add    │ MemorySize           │
│           │                              │        ├──────────────────────┤
│           │                              │        │ CodeUri              │
│           │                              │        ├──────────────────────┤
│           │                              │        │ EnvironmentVariables │
└───────────┴──────────────────────────────┴────────┴──────────────────────┘

Waiting for service ruby-demo to be deployed...
	Waiting for function fc-ruby to be deployed...
		Waiting for packaging function fc-ruby code...
		The function fc-ruby has been packaged. A total of 3 files were compressed and the final size was 1.34 KB
	function fc-ruby deploy success
service ruby-demo deploy success
```

### Invoke

```bash
➜  ruby-demo fun invoke -e "Hello World"
using template: template.yml

Missing invokeName argument, Fun will use the first function ruby-demo/fc-ruby as invokeName

========= FC invoke Logs begin =========
FC Invoke Start RequestId: 5de936be-8d06-4d82-95c6-3219dc2f0dd0"
"Hello World"
"FC Invoke End RequestId: 5de936be-8d06-4d82-95c6-3219dc2f0dd0"

Duration: 1.14 ms, Billed Duration: 100 ms, Memory Size: 512 MB, Max Memory Used: 18.02 MB
========= FC invoke Logs end =========
```