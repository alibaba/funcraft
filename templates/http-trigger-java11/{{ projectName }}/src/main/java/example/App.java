package example;

import java.io.IOException;
import java.io.OutputStream;
import javax.servlet.ServletException;

import com.aliyun.fc.runtime.Context;
import com.aliyun.fc.runtime.FunctionInitializer;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import com.aliyun.fc.runtime.HttpRequestHandler;

/**
 * Hello world!
 *
 */
public class App implements HttpRequestHandler, FunctionInitializer {

    public void initialize(Context context) throws IOException {
        //TODO
    }

    @Override
    public void handleRequest(HttpServletRequest request, HttpServletResponse response, Context context)
            throws IOException, ServletException {
        String requestPath = (String) request.getAttribute("FC_REQUEST_PATH");
        String requestURI = (String) request.getAttribute("FC_REQUEST_URI");
        String requestClientIP = (String) request.getAttribute("FC_REQUEST_CLIENT_IP"); 
        
        response.setStatus(200);
        response.setHeader("header1", "value1");
        response.setHeader("header2", "value2");
        response.setHeader("Content-Type", "text/plain");

        String body = String.format("Path: %s\n Uri: %s\n IP: %s\n", requestPath, requestURI, requestClientIP);
        OutputStream out = response.getOutputStream();
        out.write((body).getBytes());
        out.flush();
        out.close();
    }
}
