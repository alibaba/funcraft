#include "handler.h"
#include "logging.h"

using namespace Pistache;
using namespace std;
namespace Aliyun {
namespace FC {
CUSTOM_HEADER2(X_Fc_Log, "x-fc-log-result") // test only
FcBaseHandler* CustomRuntimeHandler::normalHandler = nullptr;
FcHttpBaseHandler* CustomRuntimeHandler::httpHandler = nullptr;

void CustomRuntimeHandler::onRequest(
            const Http::Request& req,
            Http::ResponseWriter response)
{
    Logger logger;
    try{
        std::cout << req.resource() << " is called." << std::endl; 
        bool handled = false;
        const std::unordered_map<std::string, Http::Header::Raw,Pistache::Http::Header::LowercaseHash, Pistache::Http::Header::LowercaseEqual>&  headers = req.headers().rawList();

        FcContext fcContext(req);
        logger.SetReqId(fcContext.requestId);
        static string initLog;
        string cmd = fcContext.controlPath.empty() ? req.resource() : fcContext.controlPath;
        if (cmd == "/invoke") {
            if (req.method() == Http::Method::Post) {
                LogString::StartInvoke(fcContext.requestId);
                logger.LogInfo("handling invoke");
                if (CustomRuntimeHandler::normalHandler == nullptr)
                {
                    response.send(Http::Code::Internal_Server_Error, "The invoke handler is not registered.");
                }
                else{
                    FcBaseHandler *fcHandler = CustomRuntimeHandler::normalHandler;
                    fcHandler->SetLogger(&logger);
                    string respBody;
                    fcHandler->OnInvoke(req.body(), fcContext, respBody);
                    LogString::EndInvoke(fcContext.requestId);
                    response.headers().add<X_Fc_Log>(initLog + logger.GetLog());
                    response.send(Http::Code::Ok, respBody);
                    handled = true;
                }
            }
        } else if (cmd == "/initialize") {
            if (req.method() == Http::Method::Post) {
                logger.LogInfo("handling initialize");
                LogString::StartInit(fcContext.requestId);
                if (CustomRuntimeHandler::normalHandler == nullptr && CustomRuntimeHandler::httpHandler == nullptr )
                {
                    response.send(Http::Code::Internal_Server_Error, "The init handler is not registered.");
                }
                else {
                    if (CustomRuntimeHandler::normalHandler) {
                        FcBaseHandler *fcHandler = CustomRuntimeHandler::normalHandler;
                        fcHandler->SetLogger(&logger);
                        fcHandler->OnInitialize(fcContext);
                    }

                    if (CustomRuntimeHandler::httpHandler) {
                        FcHttpBaseHandler *fcHandler = CustomRuntimeHandler::httpHandler;
                        fcHandler->SetLogger(&logger);
                        fcHandler->OnInitialize(fcContext); 
                    }
                    LogString::EndInit(fcContext.requestId);
                    initLog = logger.GetLog();
                    response.send(Http::Code::Ok);
                    handled = true;
                }
            }
        } else if (cmd == "/http-invoke") {
            logger.LogInfo("handling http invoke");
            if (CustomRuntimeHandler::httpHandler == nullptr)
            {
                response.send(Http::Code::Internal_Server_Error, "The http handler is not registered.");
            }
            else { 
                FcHttpBaseHandler * fcHttpHandler = CustomRuntimeHandler::httpHandler; 
                fcHttpHandler->SetLogger(&logger);
                LogString::StartInvoke(fcContext.requestId);
                response.headers().add<X_Fc_Log>(initLog + logger.GetLog());
                fcHttpHandler->OnInvoke(fcContext, req, response); 
                LogString::EndInvoke(fcContext.requestId);
                handled = true;
            }
        }

        if (!handled){
            response.send(Http::Code::Not_Found);
        }
    } catch (const std::exception& e) {
        string error = e.what();
        logger.LogError(error);
        response.send(Http::Code::Not_Found, error);
    }
}
}
}