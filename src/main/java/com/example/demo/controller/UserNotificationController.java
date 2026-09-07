package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.model.Notification;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.UserNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/user-notifications")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class UserNotificationController {

    @Autowired
    private UserNotificationService userNotificationService;

    /**
     * Récupérer toutes les notifications de l'utilisateur connecté
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication authentication) {
        String userId = getCurrentUserId(authentication);
        List<Notification> notifications = userNotificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Récupérer les notifications non lues
     */
    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(Authentication authentication) {
        String userId = getCurrentUserId(authentication);
        List<Notification> notifications = userNotificationService.getUnreadNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Compter les notifications non lues
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> countUnreadNotifications(Authentication authentication) {
        String userId = getCurrentUserId(authentication);
        long count = userNotificationService.countUnreadNotifications(userId);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    /**
     * Marquer une notification comme lue
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id) {
        userNotificationService.markAsRead(id);
        return ResponseEntity.ok(new MessageResponse("Notification marquée comme lue"));
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        String userId = getCurrentUserId(authentication);
        userNotificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new MessageResponse("Toutes les notifications ont été marquées comme lues"));
    }
    
    /**
     * Endpoint de test pour vérifier les notifications (DEBUG)
     */
    @GetMapping("/debug/all")
    public ResponseEntity<List<Notification>> getAllNotificationsDebug() {
        return ResponseEntity.ok(userNotificationService.getAllNotificationsForDebug());
    }

    /**
     * Récupérer l'ID de l'utilisateur connecté
     */
    private String getCurrentUserId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }
}
