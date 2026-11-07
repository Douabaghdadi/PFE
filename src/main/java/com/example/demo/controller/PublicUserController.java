package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public/users")
public class PublicUserController {
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/{id}/name")
    public ResponseEntity<String> getUserNameById(@PathVariable String id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(user.getUsername()))
                .orElse(ResponseEntity.ok("Utilisateur inconnu"));
    }
}
