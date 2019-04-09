# Java 函数计算示例

## Java 函数计算开发

### 依赖项

- maven

### 创建项目

```sh
$ mvn archetype:generate -DgroupId=example -DartifactId=demo -DarchetypeArtifactId=maven-archetype-quickstart -Dversion=1.0-SNAPSHOT -B
```

我们通过 mvn 命令，在 demo 路径下创建一个基础的 maven 项目。目录结构如下：

```sh
demo $ tree .
.
├── pom.xml
└── src
    ├── main
    │   └── java
    │       └── example
    │           └── App.java
    └── test
        └── java
            └── example
                └── AppTest.java

7 directories, 3 files
```

### 增加依赖

在 pom.xml 文件中增加依赖：

```xml
<dependency>
  <groupId>com.aliyun.fc.runtime</groupId>
  <artifactId>fc-java-core</artifactId>
  <version>1.0.0</version>
</dependency>
```

### 实现函数

在 App.java 文件中补充实现：

```java
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
```

### 打包项目

通过 `mvn package` 命令可以将 maven 项目打包成 jar 包。但函数计算的环境下，需要将依赖项也打包进 jar 包，因此需要在 pom.xml 文件中做一点配置：

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-assembly-plugin</artifactId>
      <configuration>
        <archive>
          <manifest>
          </manifest>
        </archive>
        <descriptorRefs>
          <descriptorRef>jar-with-dependencies</descriptorRef>
        </descriptorRefs>
      </configuration>
      <executions>
        <execution>
          <id>make-assembly</id>
          <phase>package</phase>
          <goals>
            <goal>single</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

接下来执行 mvn package 将会在 demo/target 目录下生成 demo-jar-with-dependencies.jar 文件。

## 利用 fun 进行部署

完成函数的开发后，就可以通过 fun 的 template.yaml 文件来配置函数，并实现发布。

```yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  java:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'java demo' # service description
    helloworld:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: example.App::handleRequest # handler
        Runtime: java8  # runtime
        Description: 'Hello world!' # function description
        CodeUri: './demo.jar' # Specify where the code is stored and it should be upload to FC
```

接下来通过`fun deploy`即可实现将函数部署到云端。

> 需要通过环境变量设置好 ACCOUNT_ID、ACCESS_KEY_ID、ACCESS_KEY_SECRET。

## 小结

由于函数计算环境下需要 jar 位于根目录，因此需要将之前构建好的 jar 文件移动到根目录，这个整个过程从 Makefile 文件中可以了解到。

```makefile
build:
  cd demo && mvn package
  mv demo/target/demo-1.0-SNAPSHOT-jar-with-dependencies.jar ./demo.jar

deploy: build
  fun deploy
```

部署成功后，到控制台中查看，并执行该函数，可以看到 Hello world! 的输出。
