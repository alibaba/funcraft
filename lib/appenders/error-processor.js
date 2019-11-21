'use strict';

const { FilterChain } = require('../error-processor');

// https://github.com/log4js-node/log4js-node/blob/master/docs/writing-appenders.md
function errorProcessorAppender(layout, timezoneOffset) {
  const filterChain = new FilterChain({});
  return (loggingEvent) => {
    const message = layout(loggingEvent, timezoneOffset) + '\n';
    filterChain.process(message);
  };
}

function configure(config, layouts) {
  let layout = layouts.colouredLayout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return errorProcessorAppender(layout, config.timezoneOffset);
}

exports.configure = configure;