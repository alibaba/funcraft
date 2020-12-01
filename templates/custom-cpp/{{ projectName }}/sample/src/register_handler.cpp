/* register invoke and init handler.
*/
#include "echo_handler.h"
#include "entrypoint.h"
using namespace Aliyun::FC::Handlers;
void SetInvokeAndInitHander()
{
    CustomRuntimeHandler::normalHandler = new EchoHandler();
    CustomRuntimeHandler::httpHandler = new EchoHttpHandler();
}