package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Document(collection = "nomenclatures")
public class Nomenclature {
    @Id
    private String id;

    @NotBlank
    private String type; // TYPE_FICHE, STATUT, CATEGORIE_PROJET

    @NotBlank
    private String code;

    @NotBlank
    private String libelle;

    private String description;

    private Boolean actif = true;

    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    public Nomenclature() {
        this.dateCreation = LocalDateTime.now();
    }

    public Nomenclature(String type, String code, String libelle) {
        this.type = type;
        this.code = code;
        this.libelle = libelle;
        this.dateCreation = LocalDateTime.now();
        this.actif = true;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getActif() {
        return actif;
    }

    public void setActif(Boolean actif) {
        this.actif = actif;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateModification() {
        return dateModification;
    }

    public void setDateModification(LocalDateTime dateModification) {
        this.dateModification = dateModification;
    }
}
