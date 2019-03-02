
// https://help.aliyun.com/document_detail/54788.html
module.exports.handler = function (event, context, callback) {

    var responseCode = 200;

    console.log("request: " + JSON.stringify(event.toString()));

    // 将 event 转化为 JSON 对象
    event = JSON.parse(event.toString());

    // 根据用户输入的 statusCode 返回，可用于测试不同 statusCode 的情况
    if (event.queryParameters !== null && event.queryParameters !== undefined) {
        if (event.queryParameters.httpStatus !== undefined && event.queryParameters.httpStatus !== null && event.queryParameters.httpStatus !== "") {
            console.log("Received http status: " + event.queryParameters.httpStatus);
            responseCode = event.queryParameters.httpStatus;
        }
    }

    // 如果 body 是 Base64 编码的，FC 中需要对 body 内容进行解码
    if (event.body !== null && event.body !== undefined) {
        if (event.isBase64Encoded !== null && event.isBase64Encoded !== undefined && event.isBase64Encoded) {
            event.body = new Buffer(event.body, 'base64').toString();
        }
    }

    // input 是 API 网关给 FC 的输入内容
    var responseBody = {
        message: "Hello World!",
        input: event
    };

    // 对 body 内容进行 Base64 编码，可根据需要处理
    var base64EncodeStr = new Buffer(JSON.stringify(responseBody)).toString('base64');

    // FC 给 API 网关返回的格式，须如下所示。isBase64Encoded 根据 body 是否 Base64 编码情况设置
    var response = {
        isBase64Encoded: true,
        statusCode: responseCode,
        headers: {
            "x-custom-header": "header value"
        },
        body: base64EncodeStr
    };
    
    console.log("response: " + JSON.stringify(response));

    callback(null, response);
}