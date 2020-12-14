#pragma once
#include "handler.h"
namespace Aliyun {
namespace FC {
namespace Handlers {

class EchoHttpHandler : public FcHttpBaseHandler
{
public:
   void OnInvoke(const FcContext& context, const Pistache::Http::Request& req,
            Pistache::Http::ResponseWriter& response) override; 
   void OnInitialize(const FcContext& context) override;

private:
   static std::string mInitHandler;
};
}}}