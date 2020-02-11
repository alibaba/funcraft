'use strict';

const { red } = require('colors');
const fcBuilders = require('@alicloud/fc-builders');
const fs = require('fs-extra');
const path = require('path');

const definition = require('../../definition');
const { generateMergedTpl } = require('../../tpl');

async function transformDotnetCodeUri(baseDir, serviceName, functionName, functionRes) {
  const { CodeUri: codeUri, Handler: handler, Runtime: runtime } = functionRes.Properties;
  const handlerPaths = handler.split('::');
  if (handlerPaths.length !== 3) {
    throw new Error(red(`handler ${handler} is invalid`));
  }
  const assemblyFileName = `${handlerPaths[0]}.dll`;
  const assemblyFilePath = path.resolve(baseDir, codeUri, assemblyFileName);

  if (await fs.pathExists(assemblyFilePath)) {
    return;
  }

  const artifactDir = path.resolve(codeUri, 'bin', 'Debug', runtime);
  const absCodeUri = path.resolve(baseDir, codeUri);

  const builder = new fcBuilders.Builder(serviceName, functionName, absCodeUri, runtime, artifactDir, false, ['local']);
  await builder.build();
  functionRes.Properties.CodeUri = artifactDir;
}

async function mergeTplWithoutBuildYml(templates = [], invokeName) {
  let isDotnetcore = false;
  const { tpl, tplPath } = await generateMergedTpl(templates, false, [], false);
  if (!invokeName) {
    invokeName = definition.findFirstFunctionName(tpl);
  }
  const { serviceName, serviceRes, functionName, functionRes } = definition.findFunctionInTpl(invokeName, tpl);
  if (functionRes && functionRes.Properties.Runtime === 'dotnetcore2.1') {
    isDotnetcore = true;
  }

  return {
    isDotnetcore,
    tpl, tplPath,
    serviceName, serviceRes,
    functionName, functionRes
  };
}

module.exports = {
  transformDotnetCodeUri,
  mergeTplWithoutBuildYml
};