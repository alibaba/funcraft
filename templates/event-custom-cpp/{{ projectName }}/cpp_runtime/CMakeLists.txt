cmake_minimum_required(VERSION 3.7)

include_directories(${CMAKE_SOURCE_DIR}/../include)
include_directories(${CMAKE_SOURCE_DIR}/../third-party/rapidjson/include)
link_directories(${CMAKE_SOURCE_DIR}/libs)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(cppruntime)
set(HTTP_SERVER_SOURCE_FILES ${CMAKE_SOURCE_DIR}/src/handler.cpp ${CMAKE_SOURCE_DIR}/src/logging.cpp)

add_library(cppruntime SHARED ${HTTP_SERVER_SOURCE_FILES})

set_target_properties(cppruntime PROPERTIES
                      LIBRARY_OUTPUT_DIRECTORY ../../bin)

SET (shared_pistache -Wl,--whole-archive -lpistache -Wl,--no-whole-archive)
target_link_libraries(cppruntime ${shared_pistache} pthread)