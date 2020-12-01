/* entrypoint.cpp
*/
#pragma once
#include <pistache/net.h>
#include <pistache/http.h>
#include <pistache/peer.h>
#include <pistache/endpoint.h>
#include <pistache/common.h>
#include "handler.h"
using namespace std;
using namespace Pistache;
using namespace Aliyun::FC;
void SetInvokeAndInitHander();
int main(int argc, char *argv[]) {
    Port port(9000);

    int thr = 4;

    if (argc >= 2) {
        port = std::stol(argv[1]);

        if (argc == 3)
            thr = std::stol(argv[2]);
    }

    Address addr(Ipv4::any(), port);

    cout << LogString::RuntimeStarted << endl;

    auto server = std::make_shared<Http::Endpoint>(addr);

    auto opts = Http::Endpoint::options()
        .threads(thr)
        .flags(Tcp::Options::InstallSignalHandler);
    server->init(opts);
    SetInvokeAndInitHander();
    server->setHandler(Http::make_handler<CustomRuntimeHandler>());
    server->serve();

    std::cout << "Shutdowning server" << std::endl;
    server->shutdown();
}