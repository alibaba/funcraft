package hello.services;

import hello.entity.User;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class UserService {

    private Random r = new Random();

    public User findByName(String name) {
        int randomAge = r.nextInt(100) + 1;
        User user = new User(name, randomAge);
        return user;
    }
}
