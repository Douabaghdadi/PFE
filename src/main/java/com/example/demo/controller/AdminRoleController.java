package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/roles")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    /**
     * Ajouter le rôle CHEF_PROJET à un utilisateur
     */
    @PostMapping("/add-chef-projet/{username}")
    public ResponseEntity<?> addChefProjetRole(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        Role chefProjetRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                .orElseThrow(() -> new RuntimeException("Role CHEF_PROJET not found"));

        Set<Role> roles = user.getRoles();
        roles.add(chefProjetRole);
        user.setRoles(roles);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Role CHEF_PROJET added to user: " + username));
    }

    /**
     * Endpoint public pour corriger le rôle de dcuabagh (temporaire pour debug)
     */
    @PostMapping("/fix-dcuabagh")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> fixDcuabaghRole() {
        try {
            User user = userRepository.findByUsername("dcuabagh")
                    .orElseThrow(() -> new RuntimeException("User dcuabagh not found"));

            Role chefProjetRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                    .orElseThrow(() -> new RuntimeException("Role CHEF_PROJET not found"));

            Set<Role> roles = user.getRoles();
            boolean hadRole = roles.stream()
                    .anyMatch(role -> role.getName() == ERole.ROLE_CHEF_PROJET);

            if (!hadRole) {
                roles.add(chefProjetRole);
                user.setRoles(roles);
                userRepository.save(user);
                return ResponseEntity.ok(new MessageResponse("Role CHEF_PROJET added to dcuabagh successfully!"));
            } else {
                return ResponseEntity.ok(new MessageResponse("User dcuabagh already has CHEF_PROJET role"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    /**
     * Lister tous les utilisateurs avec leurs rôles
     */
    @GetMapping("/users-roles")
    public ResponseEntity<?> listUsersWithRoles() {
        var users = userRepository.findAll();
        var result = users.stream().map(user -> {
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("username", user.getUsername());
            userInfo.put("email", user.getEmail());
            userInfo.put("roles", user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .toList());
            return userInfo;
        }).toList();

        return ResponseEntity.ok(result);
    }
}
