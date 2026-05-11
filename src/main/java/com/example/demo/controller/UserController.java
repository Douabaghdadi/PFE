package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.dto.UserRequest;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateProfile(@RequestBody UserRequest userRequest) {
        try {
            User user = userRepository.findById(userRequest.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Vérifier si le nouveau username est déjà pris par un autre utilisateur
            if (!user.getUsername().equals(userRequest.getUsername())) {
                if (userRepository.existsByUsername(userRequest.getUsername())) {
                    return ResponseEntity
                            .badRequest()
                            .body(new MessageResponse("Ce nom d'utilisateur est déjà utilisé"));
                }
                user.setUsername(userRequest.getUsername());
            }

            // Vérifier si le nouveau email est déjà pris par un autre utilisateur
            if (!user.getEmail().equals(userRequest.getEmail())) {
                if (userRepository.existsByEmail(userRequest.getEmail())) {
                    return ResponseEntity
                            .badRequest()
                            .body(new MessageResponse("Cet email est déjà utilisé"));
                }
                user.setEmail(userRequest.getEmail());
            }

            // Mettre à jour les autres champs
            user.setPhoneNumber(userRequest.getPhoneNumber());

            User updatedUser = userRepository.save(user);

            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Erreur lors de la mise à jour du profil: " + e.getMessage()));
        }
    }
}
