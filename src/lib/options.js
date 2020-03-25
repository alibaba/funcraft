'use strict';

const collectOptions = (cur, res) => {
  if (!res) {
    return [cur];
  }
  res.push(cur);
  return res;
};

module.exports = {
  collectOptions
};