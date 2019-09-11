package example;

import com.alibaba.fastjson.JSON;
import com.aliyun.fc.runtime.Context;
import com.aliyun.fc.runtime.FunctionInitializer;
import com.aliyun.fc.runtime.StreamRequestHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLClassLoader;


public class AppProxy implements StreamRequestHandler, FunctionInitializer {

    private App app = new App();

    public void initialize(Context context) throws IOException {
        app.initialize(context);
    }

    @Override
    public void handleRequest(
            InputStream inputStream, OutputStream outputStream, Context context) throws IOException {
        app.handleRequest(inputStream, outputStream, context);
    }
}
