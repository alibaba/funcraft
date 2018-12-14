'use strict';

function setProcess(envs, cwd) {
  const prevEnv = Object.assign({}, process.env);
  const prevCwd = process.cwd();

  Object.assign(process.env, envs);
  
  if (cwd) {
    process.chdir(cwd);
  }

  return () => {
    process.env = prevEnv;
    process.chdir(prevCwd);
  };
}

module.exports = { setProcess };