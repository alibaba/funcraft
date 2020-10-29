/* eslint-disable quotes, max-len */

export const rosSchema = {
  "$id": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "definitions": {
    "Aliyun::Serverless::Service": {
      "$id": "Aliyun::Serverless::Service",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Service"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Description": {
              "type": "string"
            },
            "Role": {
              "type": "string"
            },
            "Policies": {
              "oneOf": [
                { "type": "string" },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Service::Role"
                },
                {
                  "type": "array",
                  "items": {
                    "oneOf": [
                      { "type": "string" },
                      { "$ref": "#/definitions/Aliyun::Serverless::Service::Role" }
                    ]
                  }
                }
              ]
            },
            "InternetAccess": {
              "type": "boolean"
            },
            "VpcConfig": {
              "oneOf": [
                { "type": "string" },
                {
                  "type": "object",
                  "properties": {
                    "VpcId": { "type": "string" },
                    "VSwitchIds": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "SecurityGroupId": { "type": "string" }
                  },
                  "required": ["VpcId", "VSwitchIds", "SecurityGroupId"],
                  "additionalProperties": false
                }
              ]
            },
            "LogConfig": {
              "oneOf": [
                { "type": "string" },
                {
                  "type": "object",
                  "properties": {
                    "Project": { "type": "string" },
                    "Logstore": { "type": "string" }
                  },
                  "required": ["Project", "Logstore"],
                  "additionalProperties": false
                }
              ]
            },
            "NasConfig": {
              "oneOf": [
                { "type": "string" },
                {
                  "type": "object",
                  "properties": {
                    "Auto": { "type": "boolean" },
                    "UserId": { "type": "integer" },
                    "GroupId": { "type": "integer" },
                    "MountPoints": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "ServerAddr": { "type": "string" },
                          "MountDir": { "type": "string" }
                        },
                        "required": ["ServerAddr", "MountDir"],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": ["UserId", "GroupId"],
                  "additionalProperties": false
                }
              ]
            }
          },
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessservice",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice"
          }
        },
        "DependsOn": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "array",
              "items": { "type": "string" }
            }
          ]
        }
      },
      "patternProperties": {
        "^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_-]{0,127}$": {
          "$ref": "#/definitions/Aliyun::Serverless::Function"
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessservice",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessservice"
      }
    },
    "Aliyun::Serverless::Function": {
      "$id": "Aliyun::Serverless::Function",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Function"
          ]
        },
        "Properties": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "Handler": {
                  "type": "string"
                },
                "Initializer": {
                  "type": "string"
                },
                "Runtime": {
                  "type": "string",
                  "enum": ["custom-container"]
                },
                "CAPort": {
                  "type": "integer"
                },
                'CustomContainerConfig': {
                  'type': 'object',
                  'properties': {
                    'Args': {
                      'type': 'string'
                    },
                    'Command': {
                      'type': 'string'
                    },
                    'Image': {
                      'type': 'string'
                    }
                  },
                  'required': ['Image']
                },
                "CodeUri": {
                  "type": "string"
                },
                "Description": {
                  "type": "string"
                },
                "InstanceType": {
                  "type": "string",
                  "enum": ["e1", "c1"],
                },
                "AsyncConfiguration": {
                  "type": "object",
                  "properties": {
                    "Destination": {
                      "type": "object",
                      "properties": {
                        "OnSuccess": {
                          "type": "string",
                        },
                        "OnFailure": {
                          "type": "string",
                        }
                      }
                    },
                    "MaxAsyncEventAgeInSeconds": {
                      "type": "integer"
                    },
                    "MaxAsyncRetryAttempts": {
                      "type": "integer"
                    }
                  }
                },
                "Timeout": {
                  "type": "integer"
                },
                "InitializationTimeout": {
                  "type": "integer"
                },
                "EnvironmentVariables": {
                  "type": "object"
                },
                "MemorySize": {
                  "type": "integer",
                  "enum": [
                    128, 192, 256, 320, 384, 448, 512, 576, 640, 704,
                    768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280,
                    1344, 1408, 1472, 1536, 1600, 1664, 1728, 1792,
                    1856, 1920, 1984, 2048, 2112, 2176, 2240, 2304,
                    2368, 2432, 2496, 2560, 2624, 2688, 2752, 2816,
                    2880, 2944, 3008, 3072,
                    4096, 8192, 16384, 32768
                  ]
                },
                "InstanceConcurrency": {
                  "type": "integer"
                }
              },
              "required": ["Runtime", "CustomContainerConfig"],
              "additionalProperties": false,
              "document": {
                "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessfunction",
                "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction",
                "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction"
              }
            },
            {
              "type": "object",
              "properties": {
                "Handler": {
                  "type": "string"
                },
                "Initializer": {
                  "type": "string"
                },
                "Runtime": {
                  "type": "string",
                  "enum": ["nodejs6", "nodejs8", "nodejs10", "nodejs12", "python2.7", "python3", "java8", "java11", "php7.2", "dotnetcore2.1", "custom"]
                },
                "CodeUri": {
                  "type": "string"
                },
                "CAPort": {
                  "type": "integer"
                },
                "Description": {
                  "type": "string"
                },
                "InstanceType": {
                  "type": "string",
                  "enum": ["e1", "c1"]
                },
                "AsyncConfiguration": {
                  "type": "object",
                  "properties": {
                    "Destination": {
                      "type": "object",
                      "properties": {
                        "OnSuccess": {
                          "type": "string",
                        },
                        "OnFailure": {
                          "type": "string",
                        }
                      }
                    },
                    "MaxAsyncEventAgeInSeconds": {
                      "type": "integer"
                    },
                    "MaxAsyncRetryAttempts": {
                      "type": "integer"
                    }
                  }
                },
                "Timeout": {
                  "type": "integer"
                },
                "InitializationTimeout": {
                  "type": "integer"
                },
                "EnvironmentVariables": {
                  "type": "object"
                },
                "MemorySize": {
                  "type": "integer",
                  "enum": [
                    128, 192, 256, 320, 384, 448, 512, 576, 640, 704,
                    768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280,
                    1344, 1408, 1472, 1536, 1600, 1664, 1728, 1792,
                    1856, 1920, 1984, 2048, 2112, 2176, 2240, 2304,
                    2368, 2432, 2496, 2560, 2624, 2688, 2752, 2816,
                    2880, 2944, 3008, 3072,
                    4096, 8192, 16384, 32768
                  ]
                },
                "InstanceConcurrency": {
                  "type": "integer"
                }
              },
              "required": ["Handler", "Runtime", "CodeUri"],
              "additionalProperties": false,
              "document": {
                "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessfunction",
                "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction",
                "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction"
              }
            }
          ]
        },
        "Events": {
          "type": "object",
          "patternProperties": {
            "^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$": {
              "anyOf": [
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::Timer"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::HTTP"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::Log"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::OSS"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::RDS"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::MNSTopic"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::TableStore"
                },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Triggers::CDN"
                }
              ]
            }
          }
        }
      },
      "required": ["Type"],
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessfunction",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessfunction"
      }
    },
    "Aliyun::Serverless::Service::Role": {
      "$id": "Aliyun::Serverless::Service::Role",
      "type": "object",
      "properties": {
        "Version": {
          "type": "string"
        },
        "Statement": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "Effect": {
                "type": "string"
              },
              "Action": {
                "type": "array",
                "items": { "type": "string" }
              },
              "Resource": {
                "type": "string"
              }
            },
            "required": ["Effect", "Action", "Resource"],
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "Aliyun::Serverless::CustomDomain": {
      "$id": "Aliyun::Serverless::CustomDomain",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::CustomDomain"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Protocol": {
              "type": "string",
              "enum": ["HTTP", "HTTP,HTTPS"]
            },
            "RouteConfig": {
              "type": "object",
              "properties": {
                "Routes": {
                  "type": "object",
                  "patternProperties": {
                    "^/.*$": {
                      "anyOf": [
                        { "$ref": "#/definitions/Aliyun::Serverless::CustomDomain::PathConfig" }
                      ]
                    }
                  },
                  "additionalProperties": false
                },
                "routes": {
                  "type": "object",
                  "patternProperties": {
                    "^/.*$": {
                      "anyOf": [
                        { "$ref": "#/definitions/Aliyun::Serverless::CustomDomain::PathConfig" }
                      ]
                    }
                  },
                  "additionalProperties": false
                }
              }
            },
            "CertConfig": {
              "type": "object",
              "properties": {
                "CertName": {
                  "type": "string"
                },
                "PrivateKey": {
                  "type": "string"
                },
                "Certificate": {
                  "type": "string"
                }
              },
              "required": ["CertName", "PrivateKey", "Certificate"],
              "additionalProperties": false
            }
          },
          "required": ["Protocol", "RouteConfig"]
        }
      },
      "required": ["Type"],
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlesscustomdomain",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain"
      }
    },
    "Aliyun::Serverless::CustomDomain::PathConfig": {
      "$id": "Aliyun::Serverless::CustomDomain::PathConfig",
      "type": "object",
      "properties": {
        "serviceName": {
          "type": "string"
        },
        "ServiceName": {
          "type": "string"
        },
        "functionName": {
          "type": "string"
        },
        "FunctionName": {
          "type": "string"
        },
        "Qualifier": {
          "type": "string"
        }
      },
      "additionalProperties": false
    },
    "Aliyun::Serverless::Api": {
      "$id": "Aliyun::Serverless::Api",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Api"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Name": {
              "type": "string"
            },
            "StageName": {
              "type": "string"
            },
            "DefinitionBody": {
              "type": "object"
            },
            "DefinitionUri": {
              "type": "string"
            },
            "Cors": {
              "oneOf": [
                { "type": "string" },
                { "$ref": "#/definitions/Aliyun::Serverless::Api::CORS" }
              ]
            }
          },
          "required": ["StageName"],
          "additionalProperties": false
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessapi",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessapi",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessapi"
      }
    },
    "Aliyun::Serverless::Api::CORS": {
      "$id": "Aliyun::Serverless::Api::CORS",
      "type": "object",
      "properties": {
        "AllowMethods": {
          "type": "string"
        },
        "AllowHeaders": {
          "type": "string"
        },
        "AllowOrigin": {
          "type": "string"
        },
        "MaxAge": {
          "type": "string"
        }
      },
      "required": ["AllowOrigin"],
      "additionalProperties": false
    },
    "Aliyun::Serverless::TableStore": {
      "$id": "Aliyun::Serverless::TableStore",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::TableStore"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "ClusterType": {
              "type": "string",
              "enum": ["HYBRID", "SSD"]
            },
            "Description": {
              "type": "string"
            }
          },
          "required": ["ClusterType"],
          "additionalProperties": false
        }
      },
      "required": ["Type", "Properties"],
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlesstablestore",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesstablestore",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesstablestore"
      }
    },
    "Aliyun::Serverless::Log": {
      "$id": "Aliyun::Serverless::Log",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Log"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Description": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9-]{0,127}$": {
          "anyOf": [
            {
              "$ref": "#/definitions/Aliyun::Serverless::Log::Logstore"
            }
          ]
        }
      },
      "required": ["Type"],
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlesslog",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesslog",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesslog"
      }
    },
    "Aliyun::Serverless::Log::Logstore": {
      "$id": "Aliyun::Serverless::Log::Logstore",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Log::Logstore"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "TTL": {
              "type": "integer"
            },
            "ShardCount": {
              "type": "integer"
            }
          },
          "required": ["TTL", "ShardCount"],
          "additionalProperties": false
        }
      },
      "required": ["Type", "Properties"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessloglogstore",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessloglogstore",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessloglogstore"
      }
    },
    "Aliyun::Serverless::MNSTopic": {
      "$id": "Aliyun::Serverless::MNSTopic",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::MNSTopic"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Region": {
              "type": "string"
            },
            "MaximumMessageSize": {
              "type": "integer"
            },
            "LoggingEnabled": {
              "type": "boolean"
            }
          },
          "required": ["Region"],
          "additionalProperties": false
        }
      },
      "required": ["Type", "Properties"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#aliyunserverlessmnstopic",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessmnstopic",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlessmnstopic"
      }
    },
    "Aliyun::Serverless::Triggers::Timer": {
      "$id": "Aliyun::Serverless::Triggers::Timer",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Timer"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "Payload": {
              "type": "string"
            },
            "CronExpression": {
              "type": "string"
            },
            "Enable": {
              "type": "boolean"
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["CronExpression"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#timer",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#timer",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#timer"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#timer",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#timer",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#timer"
      }
    },
    "Aliyun::Serverless::Triggers::HTTP": {
      "$id": "Aliyun::Serverless::Triggers::HTTP",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "HTTP"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "AuthType": {
              "type": "string",
              "enum": ["ANONYMOUS", "FUNCTION", "anonymous", "function"]
            },
            "Methods": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": ["GET", "POST", "PUT", "DELETE", "HEAD"]
              }
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["AuthType", "Methods"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#http",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#http",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#http"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#http",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#http",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#http"
      }
    },
    "Aliyun::Serverless::Triggers::Log": {
      "$id": "Aliyun::Serverless::Triggers::Log",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Log"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "SourceConfig": {
              "type": "object",
              "properties": {
                "Logstore": {
                  "type": "string"
                }
              },
              "required": ["Logstore"],
              "additionalProperties": false
            },
            "JobConfig": {
              "type": "object",
              "properties": {
                "MaxRetryTime": {
                  "type": "number"
                },
                "TriggerInterval": {
                  "type": "number"
                }
              },
              "required": ["MaxRetryTime", "TriggerInterval"],
              "additionalProperties": false
            },
            "LogConfig": {
              "type": "object",
              "properties": {
                "Project": {
                  "type": "string"
                },
                "Logstore": {
                  "type": "string"
                }
              },
              "required": ["Project", "Logstore"],
              "additionalProperties": false
            },
            "FunctionParameter": {
              "type": "object"
            },
            "Enable": {
              "type": "boolean"
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["SourceConfig", "JobConfig", "LogConfig"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#log",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#log",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#log"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#log",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#log",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#log"
      }
    },
    "Aliyun::Serverless::Triggers::OSS": {
      "$id": "Aliyun::Serverless::Triggers::OSS",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "OSS"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "Events": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "BucketName": {
              "type": "string"
            },
            "Filter": {
              "type": "object",
              "properties": {
                "Key": {
                  "type": "object",
                  "properties": {
                    "Prefix": {
                      "type": "string"
                    },
                    "Suffix": {
                      "type": "string"
                    }
                  },
                  "required": ["Prefix", "Suffix"],
                  "additionalProperties": false
                }
              },
              "required": ["Key"],
              "additionalProperties": false
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#oss",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#oss",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#oss"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#oss",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#oss",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#oss"
      }
    },
    "Aliyun::Serverless::Triggers::RDS": {
      "$id": "Aliyun::Serverless::Triggers::RDS",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "RDS"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "InstanceId": {
              "type": "string"
            },
            "SubscriptionObjects": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "Retry": {
              "type": "integer",
              "enum": [0, 1, 2, 3]
            },
            "Concurrency": {
              "type": "integer",
              "enum": [1, 2, 3, 4, 5]
            },
            "EventFormat": {
              "type": "string",
              "enum": ["protobuf", "json", "sql"]
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["SubscriptionObjects"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#rds",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#rds",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#rds"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#rds",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#rds",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#rds"
      }
    },
    "Aliyun::Serverless::Triggers::MNSTopic": {
      "$id": "Aliyun::Serverless::Triggers::MNSTopic",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "MNSTopic"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "TopicName": {
              "type": "string"
            },
            "Region": {
              "type": "string"
            },
            "NotifyContentFormat": {
              "type": "string",
              "enum": ["STREAM", "JSON"]
            },
            "NotifyStrategy": {
              "type": "string",
              "enum": ["BACKOFF_RETRY", "EXPONENTIAL_DECAY_RETRY"]
            },
            "FilterTag": {
              "type": "string"
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["TopicName"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#mnstopic",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#mnstopic",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#mnstopic"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#mnstopic",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#mnstopic",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#mnstopic"
      }
    },
    "Aliyun::Serverless::Flow": {
      "$id": "Aliyun::Serverless::Flow",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "Aliyun::Serverless::Flow"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "Description": {
              "type": "string"
            },
            "DefinitionUri": {
              "type": "string"
            },
            "Role": {
              "type": "string"
            },
            "Policies": {
              "oneOf": [
                { "type": "string" },
                {
                  "$ref": "#/definitions/Aliyun::Serverless::Service::Role"
                },
                {
                  "type": "array",
                  "items": {
                    "oneOf": [
                      { "type": "string" },
                      { "$ref": "#/definitions/Aliyun::Serverless::Service::Role" }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    },
    "Aliyun::Serverless::Triggers::TableStore": {
      "$id": "Aliyun::Serverless::Triggers::TableStore",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "TableStore"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "InstanceName": {
              "type": "string"
            },
            "TableName": {
              "type": "string"
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["InstanceName", "TableName"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#tablestore",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#tablestore",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#tablestore"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#tablestore",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#tablestore",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#tablestore"
      }
    },
    "Aliyun::Serverless::Triggers::CDN": {
      "$id": "Aliyun::Serverless::Triggers::CDN",
      "type": "object",
      "properties": {
        "Type": {
          "type": "string",
          "enum": [
            "CDN"
          ]
        },
        "Properties": {
          "type": "object",
          "properties": {
            "InvocationRole": {
              "type": "string"
            },
            "EventName": {
              "type": "string"
            },
            "EventVersion": {
              "type": "string"
            },
            "Notes": {
              "type": "string"
            },
            "Filter": {
              "type": "object",
              "properties": {
                "Domain": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              },
              "required": ["Domain"],
              "additionalProperties": false
            },
            "Qualifier": {
              "type": "string"
            }
          },
          "required": ["EventName", "EventVersion", "Notes", "Filter"],
          "additionalProperties": false,
          "document": {
            "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#cdn",
            "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#cdn",
            "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#cdn"
          }
        }
      },
      "required": ["Type"],
      "additionalProperties": false,
      "document": {
        "default": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03.md#cdn",
        "zh-CN": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#cdn",
        "zh-TW": "https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md#cdn"
      }
    }
  },
  "properties": {
    "ROSTemplateFormatVersion": {
      "type": "string",
      "enum": [
        "2015-09-01"
      ]
    },
    "Transform": {
      "type": "string",
      "enum": [
        "Aliyun::Serverless-2018-04-03"
      ]
    },
    "Parameters": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z_][a-zA-Z.0-9_-]{0,127}$": {
          "type": "object",
          "properties": {
            "Type": {
              "type": "string",
              "enum": [
                "String",
                "Number",
                "CommaDelimitedList",
                "Json",
                "Boolean"
              ]
            },
            "Default": {},
            "AllowedValues": {
              "type": "array"
            },
            "AllowedPattern": {
              "type": "string"
            },
            "MaxLength": {
              "type": "integer"
            },
            "MinLength": {
              "type": "integer"
            },
            "MaxValue": {
              "type": "number"
            },
            "MinValue": {
              "type": "number"
            },
            "NoEcho": {
              "type": "boolean"
            },
            "Description": {
              "type": "string"
            },
            "ConstraintDescription": {
              "type": "string"
            },
            "Label": {
              "type": "string"
            },
            "AssociationProperty": {},
            "Confirm": {
              "type": "boolean"
            }
          },
          "required": ["Type"],
          "document": {
            "default": "https://help.aliyun.com/document_detail/28861.html"
          }
        }
      },
      "document": {
        "default": "https://help.aliyun.com/document_detail/28861.html"
      }
    },
    "Outputs": {
      "type": "object"
    },
    "Mappings": {
      "type": "object"
    },
    "Conditions": {
      "type": "object"
    },
    "Description": {
      "type": "string"
    },
    "Resources": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z_][a-zA-Z.0-9_-]{0,127}$": {
          "anyOf": [
            {
              "$ref": "#/definitions/Aliyun::Serverless::Service"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::CustomDomain"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::Api"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::TableStore"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::Log"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::MNSTopic"
            },
            {
              "$ref": "#/definitions/Aliyun::Serverless::Flow"
            }
          ]
        }
      }
    }
  },
  "required": ["ROSTemplateFormatVersion", "Resources"],
  "additionalProperties": false
};
