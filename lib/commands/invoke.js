'use strict';

const fc = require('../fc');
const fs = require('fs-extra');
const path = require('path');
const validate = require('../../lib/commands/validate');
const getProfile = require('../../lib/profile').getProfile;

const { getTpl, detectTplPath } = require('../tpl');
const { getTriggerMetas } = require('../../lib/import/service');
const { promptForFunctionSelection } = require('../init/prompt');
const { findFunctionsInTpl, parseFunctionPath, findFirstFunctionName } = require('../definition');
const { getEvent } = require('../utils/file');
const { red, yellow } = require('colors');

const _ = require('lodash');

const invokeTypeSupport = ['async', 'sync'];

const ROS_FUNCTION_TYPE = 'ALIYUN::FC::Function';
const ROS_TEMPLATE_PATH = path.join('.fun', 'tmp', 'rosTemplate.json');

async function findFunctionInCurrentDirectory(invokeFunctionName) {

  const tpl = await getAndVerifyTpl();

  if (!invokeFunctionName) {

    const funcName = findFirstFunctionName(tpl);

    console.log(`\nMissing invokeName argument, Fun will use the first function ${yellow(funcName)} as invokeName\n`);

    const array = funcName.split('/');
    return {
      serviceName: _.first(array),
      functionName: _.last(array)
    };
  }

  const functions = findFunctionsInTpl(tpl, (functionName, functionRes) => {

    return functionName === invokeFunctionName;
  });

  if (functions.length === 1) {

    return {
      serviceName: _.first(functions).serviceName,
      functionName: _.first(functions).functionName
    };
  }

  if (functions.length > 1) {

    return await promptForFunctionSelection(functions);
  }

  throw new Error(`don't exit function: ${invokeFunctionName}`);
}

async function getAndVerifyTpl() {

  const tplPath = await detectTplPath(false);

  if (!tplPath) {

    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  await validate(tplPath);

  return await getTpl(tplPath);
}


async function certainInvokeName(invokeName) {

  const [parsedServiceName, parsedFunctionName] = parseFunctionPath(invokeName);

  if (!parsedServiceName) {
    // fun invoke || fun invoke functionName
    return await findFunctionInCurrentDirectory(parsedFunctionName);
  }

  return {
    serviceName: parsedServiceName,
    functionName: parsedFunctionName
  };
}

async function eventPriority(options) {

  if (options.eventStdin) {

    return await getEvent('-', 'fun invoke', '/fun/invoke');
  }

  if (options.eventFile) {

    return await getEvent(path.resolve(options.eventFile), 'fun invoke', '/fun/invoke');
  }

  return options.event;
}

function displayTriggerInfo(httpTrigger, accountId, region, serviceName, functionName) {

  const methods = httpTrigger.triggerConfig['methods'];
  const qualifier = httpTrigger.qualifier ? `.${httpTrigger.qualifier}` : '';

  console.warn(`
  methods: ${yellow(methods)}
  entry point: ` + yellow(`https://${accountId}.${region}.fc.aliyuncs.com/2016-08-15/proxy/${serviceName}${qualifier}/${functionName}/`));
}

async function printHttpTriggerWarning(httpTrigger, serviceName, functionName) {

  const profile = await getProfile();

  const triggerNames = httpTrigger.map(p => p.triggerName).join(',');

  console.warn(red(`\n  Currently fun invoke does not support functions with HTTP trigger`));

  console.warn(`\n  function(name: ${functionName}) with http trigger(name: ${triggerNames}) can only be invoked with http trigger URL.`);

  httpTrigger.forEach(trigger => {

    displayTriggerInfo(trigger, profile.accountId, profile.defaultRegion, serviceName, functionName);
  });

  console.log(`\n  users can make remote calls through console, postman or fcli command line tools.`);
}

async function getHttpTrigger(serviceName, functionName) {

  const triggers = await getTriggerMetas(serviceName, functionName);

  if (_.isEmpty(triggers)) { return []; }

  const httpTrigger = triggers.filter(t => t.triggerType === 'http' || t.triggerType === 'https');

  if (_.isEmpty(httpTrigger)) { return []; }

  return httpTrigger;
}

async function readFromRosTemplate(absRosTemplatePath) {
  let rosTemplate;

  const content = await fs.readFile(absRosTemplatePath, 'utf8');
  try {

    rosTemplate = JSON.parse(content);
  } catch (err) {
    throw new Error(`Unable to parse ROS json file: ${absRosTemplatePath}.\nError: ${err}`);
  }
  return rosTemplate;
}

async function findFunctionInRosTemplate(rosTemplate, serviceName, functionName) {

  const resourceName = serviceName + functionName;
  if (rosTemplate.Resources[resourceName] && rosTemplate.Resources[resourceName].Type === ROS_FUNCTION_TYPE) {

    return {
      rosServiceName: rosTemplate.Resources[resourceName].Properties.ServiceName,
      rosFunctionName: rosTemplate.Resources[resourceName].Properties.FunctionName
    };
  }

  return {};
}

async function invoke(invokeName, options) {

  let { serviceName, functionName } = await certainInvokeName(invokeName);

  const absRosTemplatePath = path.resolve(ROS_TEMPLATE_PATH);

  if (await fs.pathExists(absRosTemplatePath)) {

    const rosTemplate = await readFromRosTemplate(absRosTemplatePath);

    const rosFuntion = await findFunctionInRosTemplate(rosTemplate, serviceName, functionName);

    if (!_.isEmpty(rosFuntion)) {

      serviceName = rosFuntion.rosServiceName;
      functionName = rosFuntion.rosFunctionName;
    }
  }

  const invocationType = options.invocationType;

  const upperCase = _.lowerCase(invocationType);

  if (!_.includes(invokeTypeSupport, upperCase)) {

    throw new Error(red(`error: unexpected argument：${invocationType}`));
  }

  const event = await eventPriority(options);

  const httpTriggers = await getHttpTrigger(serviceName, functionName);

  if (_.isEmpty(httpTriggers)) {

    return await fc.invokeFunction({serviceName, functionName, event, invocationType: _.upperFirst(upperCase)});
  }

  await printHttpTriggerWarning(httpTriggers, serviceName, functionName);
}

module.exports = invoke;
