package hello;

import hello.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import hello.services.UserService;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    @Autowired
    private UserService userService;

    @GetMapping("/")
    public User greeting(@RequestParam(defaultValue = "Bob") String name) {
        return userService.findByName(name);
    }
}
