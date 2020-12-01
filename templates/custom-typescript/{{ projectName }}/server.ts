import * as http from 'http';

const server = http.createServer(function (req: http.IncomingMessage, res: http.ServerResponse): void {
  var rid = req.headers["x-fc-request-id"];
  console.log(`FC Invoke Start RequestId: ${rid}`);
  var rawData = "";
  req.on('data', function (chunk) {
    rawData += chunk;
  });
  req.on('end', function () {
    console.log(rawData);
    res.writeHead(200);
    res.end(rawData);
    console.log(`FC Invoke End RequestId: ${rid}`);
  });
});

server.timeout = 0; // never timeout
server.keepAliveTimeout = 0; // kee palive, never timeout

server.listen(9000, '0.0.0.0', function () {
  console.log('FunctionCompute typescript runtime inited.');
});
