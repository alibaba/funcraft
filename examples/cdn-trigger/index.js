exports.handler = function(event, context, callback) {
    var eventObj = JSON.parse(event.toString());
    console.log("event: " + event);
    console.log('context: ', JSON.stringify(context));
    console.log('eventName: '+ eventObj.events[0].eventName);
    console.log('eventVersion: '+ eventObj.events[0].eventVersion);
    console.log('eventSource: '+ eventObj.events[0].eventSource);
    console.log('region: '+ eventObj.events[0].region);
    console.log('eventParameter: '+ JSON.stringify(eventObj.events[0].eventParameter,null,4))
    // cdn trigger 事件格式请参考 https://help.aliyun.com/document_detail/73333.html
    callback(null, 'hello cdn_trigger');
};