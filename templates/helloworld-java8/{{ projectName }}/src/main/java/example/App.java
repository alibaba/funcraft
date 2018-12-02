package example;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import com.aliyun.fc.runtime.Context;
import com.aliyun.fc.runtime.StreamRequestHandler;

/**
 * Hello world!
 *
 */
public class App implements StreamRequestHandler
{
    public static void main( String[] args )
    {
        System.out.println( "Hello World!" );
    }

    @Override
    public void handleRequest(
            InputStream inputStream, OutputStream outputStream, Context context) throws IOException {
        outputStream.write(new String("hello world").getBytes());
    }
}
