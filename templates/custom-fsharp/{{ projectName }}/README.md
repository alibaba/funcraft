## FSharp template for Custom Runtime

### Deploy

```bash
➜  fsharp-demo make deploy
docker run --rm -it -v $(pwd):/tmp mcr.microsoft.com/dotnet/core/sdk:3.1 bash -c "cd /tmp/FSharpDemo && dotnet publish -r linux-x64 -c Release --self-contained true && cd /tmp/FSharpDemo/bin/Release/netcoreapp3.1/linux-x64/publish && mv FSharpDemo bootstrap && chmod +x bootstrap"
Microsoft (R) Build Engine version 16.7.1+52cd83677 for .NET
Copyright (C) Microsoft Corporation. All rights reserved.

  Determining projects to restore...
  Restored /tmp/FSharpDemo/FSharpDemo.fsproj (in 10.81 sec).
  FSharpDemo -> /tmp/FSharpDemo/bin/Release/netcoreapp3.1/linux-x64/FSharpDemo.dll
  FSharpDemo -> /tmp/FSharpDemo/bin/Release/netcoreapp3.1/linux-x64/publish/
fun deploy -y
using template: template.yml
using region: cn-shanghai
using accountId: ***********3743
using accessKeyId: ***********Ptgk
using timeout: 60

Collecting your services information, in order to caculate devlopment changes...

Resources Changes(Beta version! Only FC resources changes will be displayed):

┌───────────┬──────────────────────────────┬────────┬──────────┐
│ Resource  │ ResourceType                 │ Action │ Property │
├───────────┼──────────────────────────────┼────────┼──────────┤
│ fc_fsharp │ Aliyun::Serverless::Function │ Modify │ CodeUri  │
└───────────┴──────────────────────────────┴────────┴──────────┘

Waiting for service fsharp-demo to be deployed...
	Waiting for function fc_fsharp to be deployed...
		Waiting for packaging function fc_fsharp code...
		The function fc_fsharp has been packaged. A total of 338 files were compressed and the final size was 39.33 MB
		Waiting for HTTP trigger http_t to be deployed...
		triggerName: http_t
		methods: [ 'GET', 'POST', 'PUT', 'DELETE' ]
		trigger http_t deploy success
	function fc_fsharp deploy success
service fsharp-demo deploy success

Detect 'DomainName:Auto' of custom domain 'my_domain'
Fun will reuse the temporary domain http://36792102-1986114430573743.test.functioncompute.com, expired at 2020-12-11 11:08:22, limited by 1000 per day.

Waiting for custom domain my_domain to be deployed...
custom domain my_domain deploy success
```

### Invoke

In this example, the ASP.NETCore project of F# is migrated to FC in one click, and you can directly use the HTTP client tool such as a browser or curl to invoke the function. directly curl to access the temporary domain name `http://36792102-1986114430573743.test.functioncompute.com` which is printed on the terminal in the previous step.

```bash
➜  fsharp-demo curl http://36792102-1986114430573743.test.functioncompute.com/weatherforecast
[{"date":"2020-12-01T06:18:15.8330675+00:00","temperatureC":43,"summary":"Chilly","temperatureF":109},{"date":"2020-12-02T06:18:15.8672232+00:00","temperatureC":41,"summary":"Freezing","temperatureF":105},{"date":"2020-12-03T06:18:15.8672315+00:00","temperatureC":9,"summary":"Mild","temperatureF":48},{"date":"2020-12-04T06:18:15.8672322+00:00","temperatureC":-19,"summary":"Warm","temperatureF":-2},{"date":"2020-12-05T06:18:15.8672326+00:00","temperatureC":2,"summary":"Bracing","temperatureF":35}]%
```