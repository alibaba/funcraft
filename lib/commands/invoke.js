'use strict';

const fc = require('../fc');
const path = require('path');
const validate = require('../../lib/commands/validate');
const getProfile = require('../../lib/profile').getProfile;

const { detectTplPath, getTpl } = require('../tpl');
const { getTriggerMetas } = require('../../lib/import/service');
const { promptForFunctionSelection } = require('../init/prompt');
const { findFunctionsInTpl, parseFunctionPath } = require('../definition');
const { getEvent } = require('../utils/file');
const { red, yellow } = require('colors');

const _ = require('lodash');

const invokeTypeSupport = ['async', 'sync'];

async function findFunctionInCurrentDirectory(invokeFunctionName) {

  const tplPath = await detectTplPath();

  if (!tplPath) {

    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const functions = findFunctionsInTpl(tpl, (functionName, functionRes) => {

    return functionName === invokeFunctionName;
  });

  if (functions.length === 0) {
    
    throw new Error(`don't exit function: ${invokeFunctionName}`);

  } else if (functions.length === 1) {
    
    return {
      serviceName: _.first(functions).serviceName,
      functionName: _.first(functions).functionName
    };
  } else {

    return await promptForFunctionSelection(functions);
  }
}


async function certainInvokeName(invokeName) {

  const [parsedServiceName, parsedFunctionName] = parseFunctionPath(invokeName);

  if (!parsedFunctionName) {

    throw new Error(`invalid invokeName '${invokeName}'.`);
  }

  if (!parsedServiceName) {

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

async function detectHttpTrigger(serviceName, functionName) {

  const triggers = await getTriggerMetas(serviceName, functionName);

  if (_.isEmpty(triggers)) { return; }

  const httpTrigger = triggers.filter(t => t.triggerType === 'http' || t.triggerType === 'https');

  if (_.isEmpty(httpTrigger)) { return; }

  const profile = await getProfile();

  const triggerNames = httpTrigger.map(p => p.triggerName).join(',');

  console.warn(red(`\n  Currently fun invoke does not support functions with HTTP trigger`));

  console.warn(`\n  function(name: ${functionName}) with http trigger(name: ${triggerNames}) can only be invoked with http trigger URL.`);

  httpTrigger.forEach(trigger => {

    displayTriggerInfo(trigger, profile.accountId, profile.defaultRegion, serviceName, functionName);
  });

  console.log(`\n  users can make remote calls through console, postman or fcli command line tools.`);

  throw new Error();
}

function displayTriggerInfo(httpTrigger, accountId, region, serviceName, functionName) {

  const methods = httpTrigger.triggerConfig['methods'];
  const qualifier = httpTrigger.qualifier ? `.${httpTrigger.qualifier}` : '';

  console.warn(`
  methods: ${yellow(methods)}
  entry point: ` + yellow(`https://${accountId}.${region}.fc.aliyuncs.com/2016-08-15/proxy/${serviceName}${qualifier}/${functionName}/`));
}


async function invoke(invokeName, options) {

  const { serviceName, functionName } = await certainInvokeName(invokeName);

  const invocationType = options.invocationType;

  const upperCase = _.lowerCase(invocationType);

  if (!_.includes(invokeTypeSupport, upperCase)) {

    throw new Error(red(`error: unexpected argument：${invocationType}`));
  }

  const event = await eventPriority(options);

  await detectHttpTrigger(serviceName, functionName);

  await fc.invokeFunction({serviceName, functionName, event, invocationType: _.upperFirst(upperCase)});
}

module.exports = invoke;
