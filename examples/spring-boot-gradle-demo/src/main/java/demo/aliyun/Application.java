package demo.aliyun;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping
    public String greeting() {
        return "Hello world";
    }


    @GetMapping("/2016-08-15/proxy/spring-boot-gradle-demo/spring-boot-gradle-demo")
    public String stub() {
        return "<p>您已经成功的将应用部署到了函数计算中!</p>" +
                "<p>接下来您可以学习:</p>" +
                "<ul>" +
                "<li>" +
                "<a href=\"https://github.com/alibaba/funcraft/blob/master/docs/specs/2018-04-03-zh-cn.md\">template.yaml 的文档规范</a>: 了解如何编写模板文档有助于更精确的控制服务与函数的各项配置\n" +
                "</li><li>" +
                "<a href=\"https://help.aliyun.com/document_detail/132044.html\">自定义运行时</a>: 一键部署是基于自定义运行时实现的, 了解它以便更灵活的启动您的应用\n" +
                "</li><li>" +
                "<a href=\"https://help.aliyun.com/document_detail/90759.html\">绑定自定义域名</a>\n" +
                "</li><li>" +
                "<a href=\"https://github.com/XieEDeHeiShou/fc-custom-runtime-packer\">fc-custom-runtime-packer: 一款由社区提供的 Gradle 插件, 能够一键生成符合自定义运行时规范的产物.</a>\n" +
                "</li>" +
                "</ul>"
                ;
    }

}
