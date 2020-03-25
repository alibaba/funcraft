'use strict';

const Container = require('../../edge/container');

/**
 * Stop the running edge container instance.
 *
 * @returns {Promise.<void>}
 */
async function stop() {

  const container = Container.edge();
  container.stop();
}

module.exports = stop;