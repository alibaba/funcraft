'use strict';

const definition = require('../definition');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');

function findBuildFuncs(buildName, tpl) {
  if (buildName) {
    const func = definition.findFunctionInTpl(buildName, tpl);

    if (_.isEmpty(func)) {
      throw new Error('invalid buildName ' + buildName);
    }

    return [func];
  }
  return definition.findFunctionsInTpl(tpl);
}

function updateTemplateResources(originTplContent, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir) {

  const updatedTplcontent = _.cloneDeep(originTplContent);

  const absRootArtifactsDir = path.resolve(baseDir, rootArtifactsDir);

  definition.iterateFunctions(updatedTplcontent, (serviceName, serviceRes, functionName, functionRes) => {
    const found = _.filter(buildFuncs, (buildFunc) => {

      if (_.includes(skippedBuildFuncs, buildFunc)) { return false; }

      if (_.isEqual(serviceName, buildFunc.serviceName) && _.isEqual(functionName, buildFunc.functionName)) { return true; }
      return false;
    });

    if (_.isEmpty(found)) { // refer to origin source dir
      const absCodeDir = path.resolve(baseDir, functionRes.Properties.CodeUri);
      const relativeCodeUri = path.relative(absRootArtifactsDir, absCodeDir);

      if (functionRes.Properties.Runtime === 'custom-container') {
        delete functionRes.Properties.CodeUri;
      } else {
        functionRes.Properties.CodeUri = relativeCodeUri;
      }
    } else { // refer to artifact dir
      const funcArtifactDir = path.join(rootArtifactsDir, serviceName, functionName);
      const absFuncArtifactDir = path.resolve(baseDir, funcArtifactDir);
      const relativeCodeUri = path.relative(absRootArtifactsDir, absFuncArtifactDir);

      if (functionRes.Properties.Runtime === 'custom-container') {
        delete functionRes.Properties.CodeUri;
      } else {
        functionRes.Properties.CodeUri = relativeCodeUri;
      }
    }
  });

  definition.iterateResources(updatedTplcontent.Resources, definition.FLOW_RESOURCE, (flowName, flowRes) => {
    const { Properties: flowProperties = {} } = flowRes;

    const absDefinitionUri = path.resolve(baseDir, flowProperties.DefinitionUri);

    if (!fs.pathExistsSync(absDefinitionUri)) {
      throw new Error(`DefinitionUri ${absDefinitionUri} is not exist`);
    }

    flowProperties.DefinitionUri = path.relative(rootArtifactsDir, absDefinitionUri);
  });

  return updatedTplcontent;
}

module.exports = {
  updateTemplateResources, findBuildFuncs
};