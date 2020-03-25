'use strict';

const Container = require('../../edge/container');

/**
 * Start a edge container instance.
 *
 * @returns {Promise.<void>}
 */
async function start() {
  const container = Container.edge();
  await container.start();
}

module.exports = start;