# Build dependencies

When dependencies have C/C++ Addon, it must be complied in correct Node.js environment.

The build demo is show how to create node_modules in the Function Compute container.

When you run `fun build`, it will upload runtime & dependencies of package.json to build URL, then download the compressed node_modules folder.
