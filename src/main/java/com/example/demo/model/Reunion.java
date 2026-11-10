package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Réunion Google Meet planifiée par un chef de projet ou un pilote qualité. L'événement vit dans Google Agenda ;
 * ce document garde ce que la page « Réunions » affiche et de quoi l'annuler.
 */
@Document(collection = "reunions")
public class Reunion {
    @Id
    private String id;

    private String projetId; // Vide pour une réunion planifiée par un pilote qualité
    private String titre;
    private String description;
    private LocalDateTime debut; // Heure de Tunis
    private int dureeMinutes;

    private List<String> participantIds = new ArrayList<>();
    private List<String> participantNoms = new ArrayList<>(); // Noms d'utilisateur, dans le même ordre

    private String lienMeet;

    @JsonIgnore
    private String evenementGoogleId; // ID de l'événement dans Google Agenda : sans intérêt pour le client

    private String organisateurId;
    private String organisateurNom;
    private LocalDateTime dateCreation;

    // Renseignés à la lecture, selon le lecteur : jamais enregistrés en base
    @Transient
    private String nomProjet;
    @Transient
    private boolean peutAnnuler;

    public boolean estTerminee(LocalDateTime maintenant) {
        return debut.plusMinutes(dureeMinutes).isBefore(maintenant);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjetId() { return projetId; }
    public void setProjetId(String projetId) { this.projetId = projetId; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getDebut() { return debut; }
    public void setDebut(LocalDateTime debut) { this.debut = debut; }

    public int getDureeMinutes() { return dureeMinutes; }
    public void setDureeMinutes(int dureeMinutes) { this.dureeMinutes = dureeMinutes; }

    public List<String> getParticipantIds() { return participantIds; }
    public void setParticipantIds(List<String> participantIds) { this.participantIds = participantIds; }

    public List<String> getParticipantNoms() { return participantNoms; }
    public void setParticipantNoms(List<String> participantNoms) { this.participantNoms = participantNoms; }

    public String getLienMeet() { return lienMeet; }
    public void setLienMeet(String lienMeet) { this.lienMeet = lienMeet; }

    public String getEvenementGoogleId() { return evenementGoogleId; }
    public void setEvenementGoogleId(String evenementGoogleId) { this.evenementGoogleId = evenementGoogleId; }

    public String getOrganisateurId() { return organisateurId; }
    public void setOrganisateurId(String organisateurId) { this.organisateurId = organisateurId; }

    public String getOrganisateurNom() { return organisateurNom; }
    public void setOrganisateurNom(String organisateurNom) { this.organisateurNom = organisateurNom; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public String getNomProjet() { return nomProjet; }
    public void setNomProjet(String nomProjet) { this.nomProjet = nomProjet; }

    public boolean isPeutAnnuler() { return peutAnnuler; }
    public void setPeutAnnuler(boolean peutAnnuler) { this.peutAnnuler = peutAnnuler; }
}
