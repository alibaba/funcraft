using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Aliyun.Serverless.Core;
using Aliyun.Serverless.Core.Http;

namespace {{ projectName }}
{

    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }

    class App : FcHttpEntrypoint
    {
        protected override void Init(IWebHostBuilder builder)
        { }
        
        public override async Task<HttpResponse> HandleRequest(HttpRequest request, HttpResponse response, IFcContext fcContext)
        {
            response.StatusCode = 200;
            response.ContentType = "text/plain";
            await response.WriteAsync("hello world");
            return response;
        }
    }
}

