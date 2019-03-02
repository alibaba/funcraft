var counter = 0;
exports.initializer = function(context, callback) {
    counter += 1;
    callback(null, "");
};

exports.handler = function(event, context, callback) {
    var eventObj = JSON.parse(event.toString());
    console.log("event: " + event);
    console.log('context: ', JSON.stringify(context));
    counter += 2;
    callback(null, String(counter));
};