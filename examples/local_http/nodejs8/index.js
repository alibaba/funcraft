var getRawBody = require('raw-body')

module.exports.handler = function (request, response, context) {
    // get requset header
    var reqHeader = request.headers
    var headerStr = ' '
    for (var key in reqHeader) {
        headerStr += key + ':' + reqHeader[key] + '  '
    };
    // get request info
    var url = request.url
    var path = request.path
    var queries = request.queries
    var queryStr = ''
    for (var param in queries) {
        queryStr += param + "=" + queries[param] + '  '
    };
    var method = request.method
    var clientIP = request.clientIP
    // get request body
    getRawBody(request, function (err, body) {
        var respBody = {
            headers: request.headers,
            url,
            path,
            queries,
            method, 
            clientIP,
            body: body.toString()
        };

        response.setStatusCode(200);
        response.setHeader('content-type', 'application/json');
        response.send(JSON.stringify(respBody, null, 4));
    });
};