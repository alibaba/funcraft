exports.handler = function(event, context, callback) {
    var eventObj = JSON.parse(event.toString());
    console.log("event: " + event);
    console.log('context: ', JSON.stringify(context));
    callback(null, 'hello cdn_trigger');
};