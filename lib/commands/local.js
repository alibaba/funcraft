'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local')
const util = require('util');
const validate = require('../validate/validate');
const getStdin = require('get-stdin');

const nestedObjectAssign = require('nested-object-assign');

const {
    generateVscodeDebugConfig, generateDebugEnv, generateDockerDebugOpts 
} = require('../debug');

const lstat = util.promisify(fs.lstat);

const { detectTplPath, getTpl } = require('../tpl');

const Docker = require('dockerode');
const docker = new Docker()

const { red, blue } = require('colors');

const runtimeImageMap = {
    "nodejs6": "nodejs6",
    "nodejs8": "nodejs8",
    "python2.7": "python2.7",
    "python3": "python3.6",
    "java8": "java8",
    "php7.2": "php7.2"
};

const skipPullImage = true;

async function imageExist(imageName) {

    const images = await docker.listImages({
        filters: {
            reference: [imageName]
        }
    });

    return images.length > 0;
}

async function pullImage(imageName) {
    await docker.pull(imageName);
}

function findDockerImage(runtime) {
    if (runtimeImageMap[runtime]) {
        const name = runtimeImageMap[runtime];
        const imageName = `aliyunfc/runtime-${name}`;

        debug("imageName: " + imageName);

        return imageName;
    } else {
        return null;
    }
}

// todo: 可能是目录，可能是 oss 地址
// todo: 一开始先只支持目录? jar? zip?
async function resolveCodeUriToMount(codeUri) {
    const absPath = path.resolve(codeUri);
    let target = null;

    const stats = await lstat(absPath);

    if (stats.isDirectory()) {
        target = "/code";
    } else {
        target = path.join("/code", path.basename(codeUri));
    }

    return {
        Type: 'bind',
        Source: absPath,
        Target: target
    };
}

async function invokeFunction(serviceName, functionName, functionDefinition, debugPort, event) {
    // todo: 
    // exit container, when use ctrl + c

    const functionProps = functionDefinition.Properties;

    // todo: add support for initilizer
    const handler = ["-h", functionProps.Handler, "--event", event];

    debug(`handler: ${handler}`);

    const runtime = functionProps.Runtime;

    const codeUri = functionProps.CodeUri;
    const mount = await resolveCodeUriToMount(codeUri);

    debug(`runtime: ${runtime}`);
    debug(`codeUri: ${codeUri}`);

    const imageName = findDockerImage(runtime);

    if (!imageName) {
        console.error(red(`invalid runtime name ${runtime}`));
    }

    const exist = await imageExist(imageName);

    if (!exist || !skipPullImage) {
        console.log(`begin pulling images ${imageName}...`)
        await pullImage(imageName);
    } else {
        console.log("skip pulling images ...")
    }

    debug(`mount source: ${mount}`);

    debug("debug port: " + debugPort);

   if (debugPort) {
        const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, mount.Source, debugPort);

        // todo: auto detect .vscode/launch.json in codeuri path.
        console.log("you can paste these config to .vscode/launch.json, and then attach to your running function");
        console.log('\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/ config begin \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/');
        console.log(JSON.stringify(vscodeDebugConfig, null, 4));
        console.log("\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/ config end \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/");
    }

    const opts = await generateDockerOpts(functionProps, runtime, mount, debugPort);

    debug("docker opts: %j" + opts);

    await docker.run(imageName, handler, process.stdout, opts);
}

function generateFunctionEnv(functionProps) {
    const environmentVariables = functionProps.EnvironmentVariables;

    if ( !environmentVariables ) return [];
    
    let envs = [];

    for (const [envName, envValue] of Object.entries(environmentVariables)) {
        envs.push(`${envName}=${envValue}`);
    }

    debug(`load function env: ${envs}`);

    return envs;
}

async function generateDockerOpts(functionProps, runtime, mount, debugPort) {

    let envs = generateFunctionEnv(functionProps);

    envs.push('local=true');

    const dockerOpts = {
        HostConfig: {
            AutoRemove: true,
            Mounts: [
                mount
            ],
        },
    };

    let dockerDebugOpts = {};

    if (debugPort) {
        const env = generateDebugEnv(runtime, debugPort);

        debug("debug env: " + env);

        if (env) {
            envs.push(env);
        }
        dockerDebugOpts = generateDockerDebugOpts(debugPort);
    }

    const opts = nestedObjectAssign(
        {
            Env: envs,
        },
        dockerOpts,
        dockerDebugOpts);

    debug("fc-docker docker options: %j", opts);

    return opts;
}

async function getEventContent(options) {
    const eventFile = options.event;

    let event = await getStdin();

    if (event && eventFile) {
        console.error(red("-e or stdin only one can be provided"));
        process.exit(1);
    }

    if (eventFile) {
        event = fs.readFileSync(eventFile, "utf8");
    }

    if (!event) {
        event = "{}"
    }

    console.log("use event: " + event);

    return event;
}

async function local(invokeName, options) {

    const tplPath = await detectTplPath();

    if (!tplPath) {
        console.error(red('Current folder not a fun project'));
        console.error(red('The folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
        process.exit(-1);
    } else if (path.basename(tplPath).startsWith('template')) {

        const { valid, ajv } = await validate(tplPath);

        if (!valid) {
            console.error(JSON.stringify(ajv.errors, null, 2));
            process.exit(-1);
        }

        const tpl = await getTpl(tplPath);

        let debugPort = options.debugPort;

        const event = await getEventContent(options);

        debug("event content: " + event); 

        if (debugPort) {
            debugPort = parseInt(debugPort);

            if ( Number.isNaN(debugPort) ) {
                throw Error(red('debugPort must be number'));
            }
        }

        debug(`debugPort: ${debugPort}`);

        await localInvoke(invokeName, tpl, debugPort, event);
    } else {
        console.error(red('The template file name must be template.[yml|yaml].'));
        process.exit(-1);
    }
}

function parseInvokeName(invokeName) {
    let serviceName = null;
    let functionName = null;

    let index = invokeName.indexOf("/");

    if (index < 0) {
        functionName = invokeName;
    } else {
        serviceName = invokeName.substring(0, index);
        functionName = invokeName.substring(index + 1);
    }

    debug(`invoke service: ${serviceName}`);

    debug(`invoke function: ${functionName}`);

    return [serviceName, functionName];
}

function findFunctionDefinitionInTpl(serviceName, functionName, tpl) {

    const resources = tpl.Resources;

    if (serviceName) {
        // invokeName is serviceName/functionName
        return findFunctionByServiceAndFunctionName(resources, serviceName, functionName);
    } else {
        //  invokeName is functionName
        return findFunctionDefinitionByFunctionName(resources, functionName);
    }

    return [null, null, null];
}

function findFunctionByServiceAndFunctionName(resources, serviceName, functionName) {
    debug("begin search serviceName and functionName");

    let serviceDefinition = resources[serviceName];
    let functionDefinition = null;

    let found = false;

    if (serviceName) {
        functionDefinition = serviceDefinition[functionName];
    } else {
        console.error(`could not found service: ${serviceName}`);
        process.exit(-1);
    }

    if (functionDefinition && functionDefinition.Type != 'Aliyun::Serverless::Function') {
        functionDefinition = null;
    }

    return [serviceName, funtionName, functionDefinition];
}

function findFunctionDefinitionInServiceProps(functionName, serviceProps) {

    debug("find function " + functionName + " definition in service: " + JSON.stringify(serviceProps));

    for (const [name, resource] of Object.entries(serviceProps)) {

        if (resource.Type === 'Aliyun::Serverless::Function') {
            if (name === functionName) {
                return resource;
            }
        }
    }

    return null;
}

function findFunctionDefinitionByFunctionName(resources, functionName) {
    // iterator all services and functions
    for (const [serviceName, resource] of Object.entries(resources)) {

        debug("name: " + serviceName);
        if (resource.Type === 'Aliyun::Serverless::Service') {
            debug("servicename: " + serviceName);
            const functionDefinition = findFunctionDefinitionInServiceProps(functionName, resource);

            if (functionDefinition) return [serviceName, functionName, functionDefinition];
        }
    }

    return [null, null, null];
}

async function localInvoke(invokeName, tpl, debugPort, event) {
    debug(`invokeName: ${invokeName}`);

    const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

    debug(`parse service name ${parsedServiceName}, functionName ${parsedFunctionName}`)

    const [serviceName, functionName, functionDefinition] = findFunctionDefinitionInTpl(parsedServiceName, parsedFunctionName, tpl);

    debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionDefinition: ${functionDefinition}`);

    if (!functionDefinition) {
        console.error(red(`invokeName ${invokeName} is invalid`));
        process.exit(-1);
    }

    await invokeFunction(serviceName, functionName, functionDefinition, debugPort, event);
}

module.exports = local;
