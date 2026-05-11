package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite/notifications")
@PreAuthorize("hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

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
