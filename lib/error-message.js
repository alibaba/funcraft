'use strict';

function throwProcessedException(ex, policyName) {

  if (ex.code === 'Forbidden.RAM') {
    console.error(`\n${ex.message}`);
    throw new Error(`\nMaybe you need grant ${policyName} policy to the sub-account or use the primary account.\nIf you don’t want use the ${policyName} policy or primary account, you can also specify the Role property for Service.`);
  }
  throw ex;
}

module.exports = { throwProcessedException };