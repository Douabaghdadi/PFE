package com.example.demo.controller;

import com.example.demo.dto.UserResponse;
import com.example.demo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public/users")
public class PublicUserController {
    @Autowired
    private UserService userService;

    @GetMapping("/{id}/name")
    public ResponseEntity<String> getUserNameById(@PathVariable String id) {
        try {
            UserResponse user = userService.getUserById(id);
            return ResponseEntity.ok(user.getUsername());
        } catch (RuntimeException e) {
            return ResponseEntity.ok("Utilisateur inconnu");
        }
    }
}
