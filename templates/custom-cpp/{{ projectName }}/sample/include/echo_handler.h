#pragma once
#include "handler.h"
namespace Aliyun {
namespace FC {
namespace Handlers {
class EchoHandler : public FcBaseHandler
{
public:
   void OnInvoke(const std::string& payload, const FcContext& context, std::string& response) override; 
   void OnInitialize(const FcContext& context) override;
private:
   static std::string mInitHandler;
};

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