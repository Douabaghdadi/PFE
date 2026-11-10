package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Document joint à une fiche projet ou à une fiche de suivi (compte rendu, PV, cahier des charges).
 * Le contenu du fichier est stocké à part, dans GridFS ; ce document n'en garde que la description.
 */
@Document(collection = "pieces_jointes")
public class PieceJointe {
    @Id
    private String id;

    private String entityType; // "FICHE_PROJET" ou "FICHE_SUIVI"
    private String entityId; // ID de la fiche
    private String projetId; // ID du projet (pour retrouver les documents de ses fiches de suivi)

    private String nomFichier;
    private String typeMime;
    private long taille; // En octets

    @JsonIgnore
    private String fichierId; // ID du contenu dans GridFS : sans intérêt pour le client

    private String deposeParId;
    private String deposeParNom;
    private LocalDateTime dateDepot;

    private String resume; // Résumé rédigé par l'IA : gardé, car un document joint ne change jamais

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getProjetId() { return projetId; }
    public void setProjetId(String projetId) { this.projetId = projetId; }

    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }

    public String getTypeMime() { return typeMime; }
    public void setTypeMime(String typeMime) { this.typeMime = typeMime; }

    public long getTaille() { return taille; }
    public void setTaille(long taille) { this.taille = taille; }

    public String getFichierId() { return fichierId; }
    public void setFichierId(String fichierId) { this.fichierId = fichierId; }

    public String getDeposeParId() { return deposeParId; }
    public void setDeposeParId(String deposeParId) { this.deposeParId = deposeParId; }

    public String getDeposeParNom() { return deposeParNom; }
    public void setDeposeParNom(String deposeParNom) { this.deposeParNom = deposeParNom; }

    public LocalDateTime getDateDepot() { return dateDepot; }
    public void setDateDepot(LocalDateTime dateDepot) { this.dateDepot = dateDepot; }

    public String getResume() { return resume; }
    public void setResume(String resume) { this.resume = resume; }
}
