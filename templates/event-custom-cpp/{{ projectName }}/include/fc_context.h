#pragma once
#include <string>
#include <pistache/http.h>
namespace Aliyun {
namespace FC {

struct FcHeaders
{
    static constexpr const char* RequestId = "x-fc-request-id";

    static constexpr const char* AccessId = "x-fc-access-key-id";

    static constexpr const char* AccessKey = "x-fc-access-key-secret";

    static constexpr const char* StsToken = "x-fc-security-token";

    static constexpr const char* Handler = "x-fc-function-handler";

    static constexpr const char* Initializer = "x-fc-function-initializer";

    static constexpr const char* ControlPath = "x-fc-control-path";
};

struct FcContext
{
    std::string requestId;
    std::string accessId;
    std::string accessKey;
    std::string stsToken;
    std::string handler;
    std::string initializer;
    std::string controlPath;
    FcContext(const Pistache::Http::Request& req)
    {
        requestId = req.headers().getRaw(FcHeaders::RequestId).value();
        
        auto t = req.headers().tryGetRaw(FcHeaders::AccessId);
        if (!t.isEmpty())
        {
            accessId = t.get().value();
        }
 
        t = req.headers().tryGetRaw(FcHeaders::AccessKey);
        if (!t.isEmpty())
        {
            accessKey = t.get().value();
        }
 
        t = req.headers().tryGetRaw(FcHeaders::StsToken);
        if (!t.isEmpty())
        {
            stsToken = t.get().value();
        }

        t = req.headers().tryGetRaw(FcHeaders::Handler);
        if (!t.isEmpty())
        {
            handler = t.get().value();
        }

        t = req.headers().tryGetRaw(FcHeaders::Initializer);
        if (!t.isEmpty())
        {
            initializer = t.get().value();
        }

        t = req.headers().tryGetRaw(FcHeaders::ControlPath);
        if (!t.isEmpty())
        {
            controlPath = t.get().value();
        } 
    }
};

}
}