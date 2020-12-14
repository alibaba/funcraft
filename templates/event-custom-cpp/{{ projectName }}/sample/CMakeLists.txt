cmake_minimum_required(VERSION 3.7)

include_directories(${CMAKE_SOURCE_DIR}/../include)
include_directories(${CMAKE_SOURCE_DIR}/../third-party/rapidjson/include)
include_directories(${CMAKE_SOURCE_DIR}/include)
link_directories(${CMAKE_SOURCE_DIR}/../bin)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(bootstrap)

set(RUNTIME_SOURCE_FILES ${CMAKE_SOURCE_DIR}/src/register_handler.cpp ${CMAKE_SOURCE_DIR}/src/handlers/echo_handler.cpp)

add_executable(bootstrap ${RUNTIME_SOURCE_FILES})
set_target_properties(bootstrap PROPERTIES
                      RUNTIME_OUTPUT_DIRECTORY ../../bin/)
target_link_libraries(bootstrap pthread cppruntime)