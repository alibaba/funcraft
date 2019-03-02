'use strict';

const { normalizeRoleOrPoliceName } = require('../lib/ram');

const expect = require('expect.js');

describe('test normalizeRoleOrPoliceName', () => {
  it('test valid', () => {
    const roleName = normalizeRoleOrPoliceName('test-role-name');

    expect(roleName).to.be('test-role-name');
  });

  it('test invalid', () => {
    const roleName = normalizeRoleOrPoliceName('test_role_name');
    
    expect(roleName).to.be('test-role-name');
  });
});