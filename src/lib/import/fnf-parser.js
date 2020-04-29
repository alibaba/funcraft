'use strict';

const fs = require('fs-extra');
const path = require('path');
const FNF_TYPE = 'Aliyun::Serverless::Flow';

const { doProp } = require('./utils');

function parsingFlowResource(fnfMeta, definitionYmlPath, outputDir) {
  const fnfResource = {
    Type: FNF_TYPE,
    Properties: {}
  };
  const properties = fnfResource.Properties;
  doProp(properties, 'Description', fnfMeta.Description);
  doProp(properties, 'Policies', fnfMeta.Policies);
  doProp(properties, 'Role', fnfMeta.RoleArn);
  doProp(properties, 'DefinitionUri', path.relative(outputDir, definitionYmlPath));

  fs.writeFileSync(definitionYmlPath, fnfMeta.Definition);
  return fnfResource;
}

module.exports = { parsingFlowResource };
