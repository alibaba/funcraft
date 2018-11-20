'use strict';

const { asyncWrap } = require('fc-helper');

const cbor = require('cbor');

exports.index = asyncWrap(async function (event, ctx) {
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
  return 'ok';
});
