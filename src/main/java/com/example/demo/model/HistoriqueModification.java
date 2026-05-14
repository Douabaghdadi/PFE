package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "historique_modifications")
public class HistoriqueModification {
    @Id
    private String id;
    
    private String entityType; // "FICHE_PROJET" ou "FICHE_SUIVI"
    private String entityId; // ID de la fiche modifiée
    private String projetId; // ID du projet (pour lier les fiches de suivi à leur projet)
    private String action; // "CREATION", "MODIFICATION", "SUPPRESSION"
    
    private String userId; // ID de l'utilisateur qui a fait la modification
    private String username; // Nom de l'utilisateur
    private String userRole; // Rôle de l'utilisateur
    
    private LocalDateTime dateModification;
    
    private Map<String, Object> anciennesValeurs; // Valeurs avant modification
    private Map<String, Object> nouvellesValeurs; // Valeurs après modification
    
    private String description; // Description textuelle du changement
    private String entityName; // Nom de l'entité (nom du projet ou numéro de rapport)

    public HistoriqueModification() {
        this.dateModification = LocalDateTime.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUserRole() {
        return userRole;
    }

    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }

    public LocalDateTime getDateModification() {
        return dateModification;
    }

    public void setDateModification(LocalDateTime dateModification) {
        this.dateModification = dateModification;
    }

    public Map<String, Object> getAnciennesValeurs() {
        return anciennesValeurs;
    }

    public void setAnciennesValeurs(Map<String, Object> anciennesValeurs) {
        this.anciennesValeurs = anciennesValeurs;
    }

    public Map<String, Object> getNouvellesValeurs() {
        return nouvellesValeurs;
    }

    public void setNouvellesValeurs(Map<String, Object> nouvellesValeurs) {
        this.nouvellesValeurs = nouvellesValeurs;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getProjetId() {
        return projetId;
    }

    public void setProjetId(String projetId) {
        this.projetId = projetId;
    }

    public String getEntityName() {
        return entityName;
    }

    public void setEntityName(String entityName) {
        this.entityName = entityName;
    }
}
