'use strict';

module.exports = function(fn, timeout) {

  if (!timeout) { timeout = 1500; }
    
  const t = setTimeout(fn, timeout);

  t.unref();
};