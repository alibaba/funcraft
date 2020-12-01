#include <iostream>
#include <iomanip>
#include <ctime>
#include <chrono>
#include <sstream>
#include "logging.h"
using namespace std;
namespace Aliyun {
namespace FC {
void Logger::LogInfo(const string& msg)
{
    LogCommon(LogLevel::Info, msg);
}

void Logger::LogWarn(const string& msg)
{
    LogCommon(LogLevel::Warn, msg);
}

void Logger::LogError(const string& msg)
{
    LogCommon(LogLevel::Error, msg);
}

void Logger::LogCommon(const std::string& level, const std::string& msg)
{
    auto start = std::chrono::system_clock::now();
    auto start_t = std::chrono::system_clock::to_time_t(start);
    char time_buffer[100];
    std::strftime(time_buffer, sizeof(time_buffer), "%FT%T",  std::localtime(&start_t));
    cout << time_buffer << " " << reqId << " [" << level << "] " << msg << endl; 
    buffer << time_buffer << " " << reqId << " [" << level << "] " << msg << endl; 
}

bool replace(std::string& str, const std::string& from, const std::string& to) {
    size_t start_pos = str.find(from);
    if(start_pos == std::string::npos)
        return false;
    str.replace(start_pos, from.length(), to);
    return true;
}


string Logger::GetLog() const {
    string log = buffer.str();
    replace(log, "\n", "\\n");
    return log;
}
}
}