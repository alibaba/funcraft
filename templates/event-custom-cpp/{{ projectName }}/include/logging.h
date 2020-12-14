#pragma once
#include <string>
#include <iostream>
#include <sstream>
namespace Aliyun {
namespace FC {
struct LogString
{
    static constexpr const char* RuntimeStarted = "FunctionCompute custom runtime inited.";

    static constexpr const char* InvokeStarted = "FC Invoke Start RequestId: ";

    static constexpr const char* InvokeEnd = "FC Invoke End RequestId: ";

    static constexpr const char* InitStarted = "FC Initialize Start RequestId: ";

    static constexpr const char* InitEnded = "FC Initialize End RequestId: ";

    static void StartInvoke(const std::string& requestId)
    {
        std::cout << InvokeStarted << requestId << std::endl;
    }

    static void EndInvoke(const std::string& requestId)
    {
        std::cout << InvokeEnd << requestId << std::endl;
    }

    static void StartInit(const std::string& requestId)
    {
        std::cout << InitStarted << requestId << std::endl;
    }

    static void EndInit(const std::string& requestId)
    {
        std::cout << InitEnded << requestId << std::endl;
    }
};

struct LogLevel
{
    static constexpr const char* Info = "INFO";

    static constexpr const char* Warn = "WARN";

    static constexpr const char* Error = "ERROR";
};

class Logger
{
public:
    void SetReqId(const std::string& reqId){
        this->reqId = reqId;
    }
    void LogInfo(const std::string& msg);
    void LogWarn(const std::string& msg);
    void LogError(const std::string& msg);

    std::string GetLog() const;

private:
    void LogCommon(const std::string& level, const std::string& msg);

private:
    std::string reqId;
    std::stringstream buffer;
};
}
}