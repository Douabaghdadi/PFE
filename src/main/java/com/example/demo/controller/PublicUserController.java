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
        return userRepository.findById(id).map(user -> {
            String firstName = user.getFirstName();
            String lastName = user.getLastName();
            if (firstName != null && !firstName.isBlank() && lastName != null && !lastName.isBlank()) {
                return ResponseEntity.ok(firstName + " " + lastName);
            } else if (firstName != null && !firstName.isBlank()) {
                return ResponseEntity.ok(firstName);
            }
            return ResponseEntity.ok(user.getUsername());
        }).orElse(ResponseEntity.ok("Utilisateur inconnu"));
    }
}
