#pragma once
#include <pistache/net.h>
#include <pistache/http.h>
#include <pistache/peer.h>
#include <pistache/http_headers.h>
#include <pistache/cookie.h>
#include <pistache/endpoint.h>
#include <pistache/common.h>
#include <queue>
#include <map>
#include <chrono>
#include "fc_context.h"
#include "logging.h"
namespace Aliyun {
namespace FC {
class FcBaseHandler
{
public:
   FcBaseHandler() :mLogger(nullptr) {}
   void SetLogger(Logger* logger) {mLogger = logger;}
   virtual void OnInvoke(const std::string& payload, const FcContext& context, std::string& response) = 0; 
   virtual void OnInitialize(const FcContext& context) = 0;

private:
    Logger* mLogger;
};

class FcHttpBaseHandler
{
public:
   FcHttpBaseHandler() :mLogger(nullptr) {}
   void SetLogger(Logger* logger) {mLogger = logger;}
   virtual void OnInvoke(const FcContext& context, const Pistache::Http::Request& req,
            Pistache::Http::ResponseWriter& response) = 0; 
   virtual void OnInitialize(const FcContext& context) = 0;

private:
    Logger* mLogger;    
};

class CustomRuntimeHandler : public Pistache::Http::Handler {

    HTTP_PROTOTYPE(CustomRuntimeHandler)

public:
    void onRequest(
            const Pistache::Http::Request& req,
            Pistache::Http::ResponseWriter response) override;

    static FcBaseHandler* normalHandler;
    static FcHttpBaseHandler* httpHandler;
};

#define CUSTOM_HEADER2(header_name, header_real_name) \
    class header_name : public Pistache::Http::Header::Header { \
    public:                                                     \
        NAME(header_real_name)                                  \
                                                                \
        header_name() = default;                                \
                                                                \
        explicit header_name(const char* value)                 \
        : value_{value} {}                                      \
                                                                \
        explicit header_name(std::string value)                 \
        : value_(std::move(value)) {}                           \
                                                                \
        void parseRaw(const char *str, size_t len) final        \
        { value_ = { str, len };}                               \
                                                                \
        void write(std::ostream& os) const final                \
        { os << value_; };                                      \
                                                                \
        std::string val() const { return value_; };             \
                                                                \
    private:                                                    \
        std::string value_;                                     \
    };     
}
}