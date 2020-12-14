#include "echo_handler.h"
using namespace std;
using namespace Pistache;

namespace Aliyun {
namespace FC {
namespace Handlers {

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