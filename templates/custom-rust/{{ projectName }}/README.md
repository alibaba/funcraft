## Rust template for Custom Runtime

### Quick Start

```bash
# First, we have to build an image that provides the Rust compiling environment.
$ make build-img

# Let `fun` deploy the function.
$ make deploy

# Invoke it with an event string.
$ fun invoke -e test-event
```

### Deep Dive

**Q: What's the genral procedure?**

A: To implement a custom runtime, the key component is a file named `bootstrap`, a binary or an executable script. It should start an HTTP server that listens on port `9000` and serve the HTTP requests on the following paths.

- `/invoke`: The handler for event trigger.
- `/http-invoke`: The handler for HTTP trigger.
- `/initialize`: The handler of initialization.

Behind the curtain, the FC (Function Compute) system will execute the `bootstrap`, connect to it through port 9000, and relay the request to it via HTTP.

**Q: What is `Dockerfile.build` for?**

A: It is noteworthy that the `bootstrap` will be executed in [a specific environment](https://github.com/aliyun/fc-docker/blob/master/custom/build/Dockerfile) ([more details](https://help.aliyun.com/document_detail/132044.html#h2-u6267u884Cu73AFu58833) in the doc), so we have to build the binary in the same environment. Hence we define the `Dockerfile.build` based on it and later compile the Rust code inside.

**Q: What will be uploaded?**

A: `make build` will create a directory named `pkg` and place the newly-created `bootstrap` into it. Then the `fun` CLI will automatically package `pkg` and deploy it onto FC.

**Q: Usage outside China?**

A: Currently, `Dockerfile.build` heavily relies on Chinese mirror for speeding up the installation. Specifically, Line 9-16 are the mirrors for Debian APT sources and Line 24-25 for installing Rust. Similarly, the `bootstrap/.cargo/config.toml` has also set a mirror source. Replace them with your local mirrors if you are residing outside China.