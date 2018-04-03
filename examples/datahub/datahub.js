'use strict';

const { asyncWrap } = require('fc-helper');

// {
//   "eventSource": "acs:datahub",
//   "eventName": "acs:datahub:putRecord",
//   "eventSourceARN": "/projects/test_project_name/topics/test_topic_name",
//   "region": "cn-hangzhou",
//   "records": [
//     {
//       "eventId": "0:12345",
//       "systemTime": 1463000123000,
//       "data": "[\"col1's value\",\"col2's value\"]"
//     },
//     {
//       "eventId": "0:12346",
//       "systemTime": 1463000156000,
//       "data": "[\"col1's value\",\"col2's value\"]"
//     }
//   ]
// }

exports.index = asyncWrap(async function (event, ctx) {
  var result = JSON.parse(event);
  console.log(`Event Source: ${result.eventSource}`);
  console.log(`Event Name: ${result.eventName}`);
  console.log(`Event Source ARN: ${result.eventSourceARN}`);
  console.log(`region: ${result.region}`);
  console.log(`records`);
  for (var i = 0; i < result.records.length; i++) {
    var record = result.records[i];
    console.log(`  event id: ${record.eventId}`);
    console.log(`  system time: ${record.systemTime}`);
    var data = JSON.parse(record.data);
    for (var j = 0; j < data.length; j++) {
      var item = data[j];
      console.log(`value: ${item}`);
    }
  }

  return 'ok';
});
