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
}}}