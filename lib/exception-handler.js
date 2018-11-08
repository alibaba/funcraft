'use strict';

const handler = function (err) {
    console.error(err.stack);
    process.exit(-1);
};

module.exports = handler;

