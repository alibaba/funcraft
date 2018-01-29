'use strict';

const cbor = require('cbor');

exports.index = function (event, ctx, callback) {
  var [ result ] = cbor.decodeAllSync(event);
  if (result) {
    console.log(`Version: ${result.Version}`);
    for (var i = 0; i < result.Records.length; i++) {
      var record = result.Records[i];
      console.log(`type: ${record.Type}`);
      console.log(`primary keys:`);
      for (var j = 0; j < record.PrimaryKey.length; j++) {
        var key = record.PrimaryKey[j];
        console.log(`  ${key.ColumnName}: ${key.Value}`);
      }
    }
  }
  callback(null, 'ok');
};
