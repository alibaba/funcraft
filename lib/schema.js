'use strict';

const YAML = require('js-yaml');
const _ = require('lodash');

const functionNames = [
  'Ref',
  'GetAtt'
];

const yamlType = (name, kind) => {
  const functionName = _.includes(['Ref'], name) ? name : `Fn::${name}`;
  return new YAML.Type(`!${name}`, {
    kind,
    construct: data => {
      if (name === 'GetAtt') {
        if (typeof data === 'string') {
          const [first, ...tail] = data.split('.');
          data = [first, tail.join('.')];
        }
      }
      return { [functionName]: data };
    }
  });
};

const createSchema = () => {
  const types = _.flatten(
    _.map(functionNames, functionName =>
      _.map(['mapping', 'scalar', 'sequence'], kind => yamlType(functionName, kind))
    )
  );
  return YAML.Schema.create(types);
};

module.exports = {
  schema: createSchema()
};