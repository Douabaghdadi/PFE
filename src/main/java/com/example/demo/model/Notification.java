package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;
    
    private String userId; // ID de l'utilisateur qui reçoit la notification
    private String type; // Type de notification: FICHE_PROJET_CREATED, FICHE_PROJET_UPDATED, etc.
    private String message; // Message de la notification
    private String entityId; // ID de l'entité concernée (fiche projet, fiche suivi)
    private String entityType; // Type de l'entité: FICHE_PROJET, FICHE_SUIVI
    private String actorId; // ID de l'utilisateur qui a effectué l'action
    private String actorName; // Nom de l'utilisateur qui a effectué l'action
    private boolean read; // Statut de lecture
    private LocalDateTime createdAt;
    
    public Notification() {
        this.createdAt = LocalDateTime.now();
        this.read = false;
    }
    
    public Notification(String userId, String type, String message, String entityId, String entityType, String actorId, String actorName) {
        this.userId = userId;
        this.type = type;
        this.message = message;
        this.entityId = entityId;
        this.entityType = entityType;
        this.actorId = actorId;
        this.actorName = actorName;
        this.createdAt = LocalDateTime.now();
        this.read = false;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getActorId() {
        return actorId;
    }

    public void setActorId(String actorId) {
        this.actorId = actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
