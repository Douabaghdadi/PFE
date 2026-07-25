package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.EmailService;
import com.example.demo.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite/notifications")
@PreAuthorize("hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Récupère la liste des projets en retard avec les informations des chefs de projet
     */
    @GetMapping("/late-projects")
    public ResponseEntity<List<NotificationService.NotificationInfo>> getLateProjects() {
        return ResponseEntity.ok(notificationService.getLateProjectsWithChefInfo());
    }

    /**
     * Envoie une notification à un chef de projet spécifique
     */
    @PostMapping("/send/{projetId}")
    public ResponseEntity<?> sendNotification(@PathVariable String projetId) {
        try {
            NotificationService.NotificationResult result = notificationService.sendReminderForProjet(projetId);
            String message = String.format("%d email(s) et %d SMS envoyé(s) avec succès", 
                result.getEmailsSent(), result.getSmsSent());
            return ResponseEntity.ok(new MessageResponse(message));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Erreur: " + e.getMessage()));
        }
    }

    /**
     * Récupère la liste de tous les chefs de projet
     */
    @GetMapping("/chefs")
    public ResponseEntity<?> getAllChefs() {
        Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET).orElse(null);
        if (chefRole == null) return ResponseEntity.ok(List.of());

        List<Map<String, String>> chefs = userRepository.findAll().stream()
            .filter(u -> u.getRoles() != null && u.getRoles().stream()
                .anyMatch(r -> r != null && ERole.ROLE_CHEF_PROJET.equals(r.getName())))
            .map(u -> Map.of("id", u.getId(), "username", u.getUsername(), "email", u.getEmail() != null ? u.getEmail() : ""))
            .collect(Collectors.toList());
        return ResponseEntity.ok(chefs);
    }

    /**
     * Envoie un email personnalisé à un ou tous les chefs de projet
     */
    @PostMapping("/send-custom-email")
    public ResponseEntity<?> sendCustomEmail(@RequestBody Map<String, String> body) {
        String subject = body.get("subject");
        String message = body.get("message");
        String chefId = body.get("chefId"); // null = tous

        if (subject == null || message == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Sujet et message requis"));
        }

        try {
            List<User> targets;
            if (chefId != null && !chefId.isBlank()) {
                targets = userRepository.findById(chefId).map(List::of).orElse(List.of());
            } else {
                Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET).orElse(null);
                if (chefRole == null) return ResponseEntity.ok(new MessageResponse("0 email(s) envoyé(s)"));
                targets = userRepository.findAll().stream()
                    .filter(u -> u.getRoles().stream().anyMatch(r -> r.getId().equals(chefRole.getId())))
                    .collect(Collectors.toList());
            }

            int sent = 0;
            for (User chef : targets) {
                if (chef.getEmail() != null && !chef.getEmail().isBlank()) {
                    emailService.sendSimpleEmail(chef.getEmail(), subject, message);
                    sent++;
                }
            }
            return ResponseEntity.ok(new MessageResponse(sent + " email(s) envoyé(s) avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Erreur: " + e.getMessage()));
        }
    }

    /**
     * Envoie des notifications à tous les chefs de projet en retard
     */
    @PostMapping("/send-all")
    public ResponseEntity<?> sendAllNotifications() {
        try {
            NotificationService.NotificationResult result = notificationService.sendRemindersToAllLateChefs();
            String message = String.format("%d email(s) et %d SMS envoyé(s) avec succès", 
                result.getEmailsSent(), result.getSmsSent());
            return ResponseEntity.ok(new MessageResponse(message));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Erreur: " + e.getMessage()));
        }
    }
}
