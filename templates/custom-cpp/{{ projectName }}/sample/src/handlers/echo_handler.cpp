#include "echo_handler.h"
using namespace std;
using namespace Pistache;

namespace Aliyun {
namespace FC {
namespace Handlers {
std::string EchoHandler::mInitHandler;
void EchoHandler::OnInvoke(const string& payload, const FcContext& context, string& response)
{
    response = EchoHandler::mInitHandler + payload;
}

void EchoHandler::OnInitialize(const FcContext& context)
{
    EchoHandler::mInitHandler = context.initializer;
}

std::string EchoHttpHandler::mInitHandler;
void EchoHttpHandler::OnInvoke(const FcContext& context, const Pistache::Http::Request& req,
            Pistache::Http::ResponseWriter& response)
{
    response.send(Http::Code::Ok, EchoHttpHandler::mInitHandler + req.body());
} 

void EchoHttpHandler::OnInitialize(const FcContext& context)
{
    EchoHttpHandler::mInitHandler = context.initializer;
}
}}}