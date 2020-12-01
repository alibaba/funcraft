## CPP template for Custom Runtime

### Deploy

```bash
➜  cpp-demo make deploy
docker build -t fc-cpp-runtime  -f build-image/Dockerfile build-image
Sending build context to Docker daemon  2.048kB
Step 1/3 : FROM aliyunfc/runtime-custom:base
 ---> a3a8eca8b38c
Step 2/3 : RUN apt-get update
 ---> Using cache
 ---> 81400bfb9cec
Step 3/3 : RUN apt-get install -y cmake
 ---> Using cache
 ---> b67b2de010fe
Successfully built b67b2de010fe
Successfully tagged fc-cpp-runtime:latest
docker run --rm -it -v $(pwd):/tmp fc-cpp-runtime bash -c "cd /tmp && ./build.sh"
-- The C compiler identification is GNU 6.3.0
-- The CXX compiler identification is GNU 6.3.0
-- Check for working C compiler: /usr/bin/cc
-- Check for working C compiler: /usr/bin/cc -- works
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Detecting C compile features
-- Detecting C compile features - done
-- Check for working CXX compiler: /usr/bin/c++
-- Check for working CXX compiler: /usr/bin/c++ -- works
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Configuring done
-- Generating done
-- Build files have been written to: /tmp/cpp_runtime/release
Scanning dependencies of target cppruntime
[ 33%] Building CXX object CMakeFiles/cppruntime.dir/src/handler.cpp.o
[ 66%] Building CXX object CMakeFiles/cppruntime.dir/src/logging.cpp.o
[100%] Linking CXX shared library /tmp/bin/libcppruntime.so
[100%] Built target cppruntime
-- The C compiler identification is GNU 6.3.0
-- The CXX compiler identification is GNU 6.3.0
-- Check for working C compiler: /usr/bin/cc
-- Check for working C compiler: /usr/bin/cc -- works
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Detecting C compile features
-- Detecting C compile features - done
-- Check for working CXX compiler: /usr/bin/c++
-- Check for working CXX compiler: /usr/bin/c++ -- works
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Configuring done
-- Generating done
-- Build files have been written to: /tmp/sample/release
Scanning dependencies of target bootstrap
[ 33%] Building CXX object CMakeFiles/bootstrap.dir/src/register_handler.cpp.o
[ 66%] Building CXX object CMakeFiles/bootstrap.dir/src/handlers/echo_handler.cpp.o
[100%] Linking CXX executable /tmp/bin/bootstrap
[100%] Built target bootstrap
fun deploy -y
using template: template.yml
using region: cn-shanghai
using accountId: ***********3743
using accessKeyId: ***********Ptgk
using timeout: 60

Collecting your services information, in order to caculate devlopment changes...

Resources Changes(Beta version! Only FC resources changes will be displayed):

┌──────────────┬──────────────────────────────┬────────┬─────────────┐
│ Resource     │ ResourceType                 │ Action │ Property    │
├──────────────┼──────────────────────────────┼────────┼─────────────┤
│ cpp-demo     │ Aliyun::Serverless::Service  │ Add    │ Description │
├──────────────┼──────────────────────────────┼────────┼─────────────┤
│              │                              │        │ Handler     │
│              │                              │        ├─────────────┤
│              │                              │        │ Runtime     │
│ fc_cpp_event │ Aliyun::Serverless::Function │ Add    ├─────────────┤
│              │                              │        │ MemorySize  │
│              │                              │        ├─────────────┤
│              │                              │        │ CodeUri     │
├──────────────┼──────────────────────────────┼────────┼─────────────┤
│              │                              │        │ Handler     │
│              │                              │        ├─────────────┤
│              │                              │        │ Runtime     │
│ fc_cpp_http  │ Aliyun::Serverless::Function │ Add    ├─────────────┤
│              │                              │        │ MemorySize  │
│              │                              │        ├─────────────┤
│              │                              │        │ CodeUri     │
├──────────────┼──────────────────────────────┼────────┼─────────────┤
│              │                              │        │ AuthType    │
│ http_t       │ HTTP                         │ Add    ├─────────────┤
│              │                              │        │ Methods     │
└──────────────┴──────────────────────────────┴────────┴─────────────┘

Waiting for service cpp-demo to be deployed...
	Waiting for function fc_cpp_event to be deployed...
		Waiting for packaging function fc_cpp_event code...
		The function fc_cpp_event has been packaged. A total of 2 files were compressed and the final size was 446.37 KB
	function fc_cpp_event deploy success
	Waiting for function fc_cpp_http to be deployed...
		Waiting for packaging function fc_cpp_http code...
		The function fc_cpp_http has been packaged. A total of 2 files were compressed and the final size was 446.37 KB
		Waiting for HTTP trigger http_t to be deployed...
		triggerName: http_t
		methods: [ 'GET', 'POST', 'PUT', 'DELETE' ]
		trigger http_t deploy success
	function fc_cpp_http deploy success
service cpp-demo deploy success

Detect 'DomainName:Auto' of custom domain 'my_domain'
Request a new temporary domain ...
The assigned temporary domain is http://36822536-1986114430573743.test.functioncompute.com，expired at 2020-12-11 19:35:36, limited by 1000 per day.
Waiting for custom domain my_domain to be deployed...
custom domain my_domain deploy success
```

### Invoke

There are a event function and a http trigger function in the example. 

You can directly use the HTTP client tool such as a browser or curl to invoke the http trigger function. The temporary domain name which is printed on the terminal in the previous step is `http://36822536-1986114430573743.test.functioncompute.com`.

```bash
# Invoke event function
➜  cpp-demo make invoke
fun invoke cpp-demo/fc_cpp_event -e "Hello World"
========= FC invoke Logs begin =========
/invoke is called.
FC Invoke Start RequestId: 64cfa1ca-99d2-4f27-b68f-4eea6890ec2c
2020-12-01T11:41:12 64cfa1ca-99d2-4f27-b68f-4eea6890ec2c [INFO] handling invoke
FC Invoke End RequestId: 64cfa1ca-99d2-4f27-b68f-4eea6890ec2c
Duration: 31.82 ms, Billed Duration: 100 ms, Memory Size: 512 MB, Max Memory Used: 5.92 MB
========= FC invoke Logs end =========

FC Invoke Result:
Hello World


# Invoke http trigger function
➜  cpp-demo curl http://36822536-1986114430573743.test.functioncompute.com -d "Hello World"
Hello World
```