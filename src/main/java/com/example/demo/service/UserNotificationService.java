package com.example.demo.service;

import com.example.demo.model.ERole;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.Notification;
import com.example.demo.model.User;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserNotificationService {

    @Autowired
    private NotificationRepository notificationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    /**
     * Récupérer toutes les notifications d'un utilisateur (30 derniers jours)
     */
    public List<Notification> getUserNotifications(String userId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        return notificationRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, thirtyDaysAgo);
    }

    /**
     * Récupérer les notifications non lues d'un utilisateur
     */
    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
    }

    /**
     * Compter les notifications non lues
     */
    public long countUnreadNotifications(String userId) {
        return notificationRepository.countByUserIdAndRead(userId, false);
    }

    /**
     * Marquer une notification comme lue
     */
    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    /**
     * Marquer toutes les notifications d'un utilisateur comme lues
     */
    public void markAllAsRead(String userId) {
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    /**
     * Créer une notification pour une action sur une fiche de projet
     */
    public void createFicheProjetNotification(String ficheProjetId, String action, String actorId) {
        FicheProjet ficheProjet = ficheProjetRepository.findById(ficheProjetId).orElse(null);
        if (ficheProjet == null) return;

        User actor = userRepository.findById(actorId).orElse(null);
        if (actor == null) return;

        String actorName = actor.getFirstName() != null && actor.getLastName() != null 
            ? actor.getFirstName() + " " + actor.getLastName() 
            : actor.getUsername();

        String message = buildFicheProjetMessage(action, actorName, ficheProjet.getNomProjet());
        String notificationType = "FICHE_PROJET_" + action.toUpperCase();

        // Notifier les pilotes qualité si l'acteur est un chef de projet
        if (isChefProjet(actor)) {
            List<User> pilotesQualite = getPilotesQualite();
            for (User pilote : pilotesQualite) {
                Notification notification = new Notification(
                    pilote.getId(),
                    notificationType,
                    message,
                    ficheProjetId,
                    "FICHE_PROJET",
                    actorId,
                    actorName
                );
                notificationRepository.save(notification);
            }
        }
    }

    /**
     * Créer une notification pour une action sur une fiche de suivi
     */
    public void createFicheSuiviNotification(String ficheSuiviId, String projetName, String action, String actorId) {
        User actor = userRepository.findById(actorId).orElse(null);
        if (actor == null) return;

        String actorName = actor.getFirstName() != null && actor.getLastName() != null 
            ? actor.getFirstName() + " " + actor.getLastName() 
            : actor.getUsername();

        String message = buildFicheSuiviMessage(action, actorName, projetName);
        String notificationType = "FICHE_SUIVI_" + action.toUpperCase();

        // Notifier les pilotes qualité si l'acteur est un chef de projet
        if (isChefProjet(actor)) {
            List<User> pilotesQualite = getPilotesQualite();
            for (User pilote : pilotesQualite) {
                Notification notification = new Notification(
                    pilote.getId(),
                    notificationType,
                    message,
                    ficheSuiviId,
                    "FICHE_SUIVI",
                    actorId,
                    actorName
                );
                notificationRepository.save(notification);
            }
        }
    }

    /**
     * Créer une notification quand un pilote qualité consulte une fiche
     */
    public void createViewNotification(String entityId, String entityType, String entityName, String piloteQualiteId, String chefProjetId) {
        System.out.println("=== DEBUG createViewNotification ===");
        System.out.println("entityId: " + entityId);
        System.out.println("entityType: " + entityType);
        System.out.println("entityName: " + entityName);
        System.out.println("piloteQualiteId: " + piloteQualiteId);
        System.out.println("chefProjetId: " + chefProjetId);
        
        User pilote = userRepository.findById(piloteQualiteId).orElse(null);
        if (pilote == null) {
            System.err.println("ERREUR: Pilote qualité non trouvé avec ID: " + piloteQualiteId);
            return;
        }
        
        User chefProjet = userRepository.findById(chefProjetId).orElse(null);
        if (chefProjet == null) {
            System.err.println("ERREUR: Chef de projet non trouvé avec ID: " + chefProjetId);
            return;
        }

        String piloteName = pilote.getFirstName() != null && pilote.getLastName() != null 
            ? pilote.getFirstName() + " " + pilote.getLastName() 
            : pilote.getUsername();

        String message = piloteName + " a consulté ";
        if ("FICHE_PROJET".equals(entityType)) {
            message += "la fiche de projet \"" + entityName + "\"";
        } else if ("FICHE_SUIVI".equals(entityType)) {
            message += "la fiche de suivi du projet \"" + entityName + "\"";
        } else if ("HISTORIQUE_PROJET".equals(entityType)) {
            message += "l'historique du projet \"" + entityName + "\"";
        } else if ("PERIODICITE".equals(entityType)) {
            String[] parts = entityName.split("\\|");
            String nomProjet = parts[0];
            String mois = parts.length > 1 ? parts[1] : "?";
            message = piloteName + " a défini une périodicité de " + mois + " mois pour le projet \"" + nomProjet + "\"";
        }

        Notification notification = new Notification(
            chefProjetId,
            entityType + "_VIEWED",
            message,
            entityId,
            entityType,
            piloteQualiteId,
            piloteName
        );
        
        Notification saved = notificationRepository.save(notification);
        System.out.println("Notification créée avec succès! ID: " + saved.getId());
        System.out.println("Message: " + message);
        System.out.println("====================================");
    }

    /**
     * Nettoyer les notifications de plus de 30 jours
     */
    public void cleanOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        notificationRepository.deleteByCreatedAtBefore(thirtyDaysAgo);
    }
    
    /**
     * Méthode de debug pour récupérer toutes les notifications
     */
    public List<Notification> getAllNotificationsForDebug() {
        return notificationRepository.findAll();
    }

    // Méthodes utilitaires privées

    private String buildFicheProjetMessage(String action, String actorName, String projetName) {
        switch (action.toUpperCase()) {
            case "CREATED":
                return actorName + " a créé la fiche de projet \"" + projetName + "\"";
            case "UPDATED":
                return actorName + " a modifié la fiche de projet \"" + projetName + "\"";
            case "DELETED":
                return actorName + " a supprimé la fiche de projet \"" + projetName + "\"";
            default:
                return actorName + " a effectué une action sur la fiche de projet \"" + projetName + "\"";
        }
    }

    private String buildFicheSuiviMessage(String action, String actorName, String projetName) {
        switch (action.toUpperCase()) {
            case "CREATED":
                return actorName + " a créé une fiche de suivi pour le projet \"" + projetName + "\"";
            case "UPDATED":
                return actorName + " a modifié une fiche de suivi du projet \"" + projetName + "\"";
            case "DELETED":
                return actorName + " a supprimé une fiche de suivi du projet \"" + projetName + "\"";
            default:
                return actorName + " a effectué une action sur une fiche de suivi du projet \"" + projetName + "\"";
        }
    }

    private boolean isChefProjet(User user) {
        return user.getRoles().stream()
            .anyMatch(role -> role.getName() == ERole.ROLE_CHEF_PROJET);
    }

    private boolean isPiloteQualite(User user) {
        return user.getRoles().stream()
            .anyMatch(role -> role.getName() == ERole.ROLE_PILOTE_QUALITE);
    }

    private List<User> getPilotesQualite() {
        return userRepository.findAll().stream()
            .filter(this::isPiloteQualite)
            .toList();
    }
}
