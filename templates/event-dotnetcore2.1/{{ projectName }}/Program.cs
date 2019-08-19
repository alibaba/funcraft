using System;
using System.IO;
using Aliyun.Serverless.Core;

namespace {{ projectName }}
{

    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }

    class App
    {
        public string Handler(Stream input, IFcContext context)
        {
            return "hello word";
        }
    }
}

