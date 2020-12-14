## CPP template for Custom Runtime

### Deploy

```bash
$  http-custom-cpp make deploy
```

### Invoke

You can directly use the HTTP client tool such as a browser or curl to invoke the http trigger function. 

```bash
$  http-custom-cpp curl ${domain} -d "Hello World"
Hello World
```