package example;

import com.aliyun.fc.runtime.*;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Entrypoint implements StreamRequestHandler, FunctionInitializer, HttpRequestHandler {

    private ClassLoader nasLibClassloader;
    private static final Map<String, Object> handlerObjectCache = new ConcurrentHashMap<>();

    {
        List<URL> classpathExt = Stream.of(System.getenv("JAVA_PATH"), "/code")
                .map(p -> new File(p))
                .flatMap(f -> Stream.concat(Stream.of(f), listJar(f)))
                .map(f -> {
                    try {
                        return f.toURI().toURL();
                    } catch (MalformedURLException e) {
                        e.printStackTrace();
                    }
                    return null;
                })
                .collect(Collectors.toList());

        nasLibClassloader = new ChildFirstURLClassLoader(classpathExt.toArray(new URL[0]), Thread.currentThread().getContextClassLoader());

    }

    private Stream<File> listJar(File dir) {
        File[] jarFiles = dir.listFiles((_dir, name) ->
                name.endsWith(".jar") || name.endsWith(".JAR") || name.endsWith(".zip") || name.endsWith(".ZIP"));

        if (jarFiles == null) {
            return Stream.empty();
        } else {
            return Stream.of(jarFiles);
        }
    }

    private Class<?> loadClass(String className, Class<?> superClass) {
        try {
            Class customerClass = Class.forName(className, true, nasLibClassloader);
            if (PojoRequestHandler.class.isAssignableFrom(customerClass)) {
                throw new RuntimeException("interface com.aliyun.fc.runtime.PojoRequestHandler is not support, please use other com.aliyun.fc.runtime interfaces");
            }
            if (!superClass.isAssignableFrom(customerClass)) {
                throw new RuntimeException(String.format("Handler class '%s' must implement one of the com.aliyun.fc.runtime interfaces", className));
            }
            return customerClass;
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
    }

    private Object newObject(Class<?> clasz) {
        try {
            return clasz.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Object getHandlerObject(String className, Class<?> superClass) {
        Object handler = handlerObjectCache.get(className);
        if (handler == null) {
            handler = newObject(loadClass(className, superClass));
            handlerObjectCache.put(className, handler);
        }
        return handler;
    }

    private String[] splitHandlerName(String handlerName) {
        String[] splittedNames = handlerName.split("::");

        if (splittedNames.length != 2) {
            throw new RuntimeException(String.format("Handler '%s' must contain one and only one \'::\'", handlerName));
        }
        return splittedNames;
    }

    private void invokeMethod(String envKey,Class<?> superClass, Class<?>[] parameterTypes, Object... args) {

        String handlerName = System.getenv(envKey);

        if (handlerName == null) {
            throw new RuntimeException(String.format("ENV: '%s' is not set", envKey));
        }


        String[] splittedNames = splitHandlerName(handlerName);
        String className = splittedNames[0];
        String methodName = splittedNames[1];

        Class<?> customClass = loadClass(className, FunctionInitializer.class);

        try {
            Method initialize = customClass.getDeclaredMethod(methodName, parameterTypes);
            initialize.invoke(getHandlerObject(className, superClass), args);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }

    private Class<?>[] asClassList(Class<?>... classes) {
        return classes;
    }


    public void initialize(Context context) throws IOException {

        Thread.currentThread().setContextClassLoader(nasLibClassloader);


        invokeMethod("FUN_INITIALIZER", FunctionInitializer.class, asClassList(Context.class), context);
    }

    @Override
    public void handleRequest(
            InputStream inputStream, OutputStream outputStream, Context context) throws IOException {

        Thread.currentThread().setContextClassLoader(nasLibClassloader);

        invokeMethod("FUN_HANDLER", StreamRequestHandler.class, asClassList(InputStream.class, OutputStream.class, Context.class), inputStream, outputStream, context);
    }

    @Override
    public void handleRequest(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, Context context) throws IOException, ServletException {
        Thread.currentThread().setContextClassLoader(nasLibClassloader);

        invokeMethod("FUN_HANDLER", HttpRequestHandler.class, asClassList(HttpServletRequest.class, HttpServletResponse.class, Context.class), httpServletRequest, httpServletResponse, context);
    }
}

class ChildFirstURLClassLoader extends URLClassLoader {

    private ClassLoader system;

    public ChildFirstURLClassLoader(URL[] classpath, ClassLoader parent) {
        super(classpath, parent);
        system = getSystemClassLoader();
    }

    @Override
    protected synchronized Class<?> loadClass(String name, boolean resolve)
            throws ClassNotFoundException {
        // First, check if the class has already been loaded
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            if (system != null) {
                try {
                    // checking system: jvm classes, endorsed, cmd classpath, etc.
                    c = system.loadClass(name);
                } catch (ClassNotFoundException ignored) {
                }
            }
            if (c == null) {
                try {
                    // checking local
                    c = findClass(name);
                } catch (ClassNotFoundException e) {
                    // checking parent
                    // This call to loadClass may eventually call findClass again, in case the parent doesn't find anything.
                    c = super.loadClass(name, resolve);
                }
            }
        }
        if (resolve) {
            resolveClass(c);
        }
        return c;
    }

    @Override
    public URL getResource(String name) {
        URL url = null;
        if (system != null) {
            url = system.getResource(name);
        }
        if (url == null) {
            url = findResource(name);
            if (url == null) {
                // This call to getResource may eventually call findResource again, in case the parent doesn't find anything.
                url = super.getResource(name);
            }
        }
        return url;
    }

    @Override
    public Enumeration<URL> getResources(String name) throws IOException {
        /**
         * Similar to super, but local resources are enumerated before parent resources
         */
        Enumeration<URL> systemUrls = null;
        if (system != null) {
            systemUrls = system.getResources(name);
        }
        Enumeration<URL> localUrls = findResources(name);
        Enumeration<URL> parentUrls = null;
        if (getParent() != null) {
            parentUrls = getParent().getResources(name);
        }
        final List<URL> urls = new ArrayList<URL>();
        if (systemUrls != null) {
            while (systemUrls.hasMoreElements()) {
                urls.add(systemUrls.nextElement());
            }
        }
        if (localUrls != null) {
            while (localUrls.hasMoreElements()) {
                urls.add(localUrls.nextElement());
            }
        }
        if (parentUrls != null) {
            while (parentUrls.hasMoreElements()) {
                urls.add(parentUrls.nextElement());
            }
        }
        return new Enumeration<URL>() {
            Iterator<URL> iter = urls.iterator();

            public boolean hasMoreElements() {
                return iter.hasNext();
            }

            public URL nextElement() {
                return iter.next();
            }
        };
    }

    @Override
    public InputStream getResourceAsStream(String name) {
        URL url = getResource(name);
        try {
            return url != null ? url.openStream() : null;
        } catch (IOException e) {
        }
        return null;
    }
}
