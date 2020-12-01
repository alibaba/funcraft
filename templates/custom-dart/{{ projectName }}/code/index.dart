import 'dart:io';

Future main() async {
  var server = await HttpServer.bind(
    InternetAddress.anyIPv4,
    9000,
  );
  // #enddocregion bind
  print('FunctionCompute dart2.8 runtime inited!');
  print('Listening on *:${server.port}');

  // #docregion listen
  await for (HttpRequest request in server) {
    var rid = request.headers.value("x-fc-request-id");
    print("FC Invoke Start RequestId: $rid");

    // do your things
    print("hello world");
    request.response.write("Hello World");

    await request.response.close();
    print("FC Invoke End RequestId: $rid");
  }
}
