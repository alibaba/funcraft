package example;

import com.aliyun.fc.runtime.Context;
import com.aliyun.fc.runtime.FunctionInitializer;
import com.aliyun.fc.runtime.StreamRequestHandler;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Entrypoint implements StreamRequestHandler, FunctionInitializer {

    private ClassLoader nasLibClassloader;
    private Class<?> appClass;
    private Object appObj;

    {

        List<URL> classpathExt = Stream.of("/mnt/auto/lib", "/code")
                .map(p -> new File(p))
                .flatMap(f -> Stream.concat(Stream.of(f), Stream.of(f.listFiles((_dir, name) -> name.endsWith(".jar")))))
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


        try {
            appClass = Class.forName("example.AppProxy", true, nasLibClassloader);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }


        try {
            appObj = appClass.getDeclaredConstructor().newInstance();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        }
    }

    public void initialize(Context context) throws IOException {
        Thread.currentThread().setContextClassLoader(nasLibClassloader);

        try {
            Method initialize = appClass.getDeclaredMethod("initialize", Context.class);
            initialize.invoke(appObj, context);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void handleRequest(
            InputStream inputStream, OutputStream outputStream, Context context) throws IOException {
        Thread.currentThread().setContextClassLoader(nasLibClassloader);

        try {
            Method handleRequest = appClass.getDeclaredMethod("handleRequest", InputStream.class, OutputStream.class, Context.class);
            handleRequest.invoke(appObj, inputStream, outputStream, context);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
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
