package com.example.demo.model;

import java.time.LocalDateTime;

/**
 * État de validation d'une fiche projet ou d'une fiche de suivi, enregistré dans la fiche elle-même.
 * Les règles sont ici pour valoir à l'identique sur les deux types de fiches.
 * Une fiche enregistrée avant l'ajout de ce champ n'en a pas en base : elle se lit « À valider ».
 */
public class ValidationFiche {
    private StatutValidation statut = StatutValidation.A_VALIDER;
    private String motif;
    private String piloteId;
    private String piloteNom;
    private LocalDateTime dateDecision;

    public void valider(String piloteId, String piloteNom) {
        if (statut != StatutValidation.A_VALIDER) {
            throw new IllegalStateException("Cette fiche n'est plus à valider : rechargez la page pour voir son état.");
        }
        enregistrerDecision(StatutValidation.VALIDEE, null, piloteId, piloteNom);
    }

    /** Reste possible sur une fiche validée, pour reprendre une erreur repérée après coup. */
    public void demanderCorrection(String motif, String piloteId, String piloteNom) {
        if (statut == StatutValidation.A_CORRIGER) {
            throw new IllegalStateException("Une correction est déjà demandée sur cette fiche.");
        }
        enregistrerDecision(StatutValidation.A_CORRIGER, motif, piloteId, piloteNom);
    }

    /** Une décision porte sur un contenu : dès que le chef de projet le change, elle ne vaut plus. */
    public void remettreAValider() {
        statut = StatutValidation.A_VALIDER;
        motif = null;
        piloteId = null;
        piloteNom = null;
        dateDecision = null;
    }

    private void enregistrerDecision(StatutValidation nouveauStatut, String motif, String piloteId, String piloteNom) {
        this.statut = nouveauStatut;
        this.motif = motif;
        this.piloteId = piloteId;
        this.piloteNom = piloteNom;
        this.dateDecision = LocalDateTime.now();
    }

    public StatutValidation getStatut() { return statut; }
    public void setStatut(StatutValidation statut) { this.statut = statut; }

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }

    public String getPiloteId() { return piloteId; }
    public void setPiloteId(String piloteId) { this.piloteId = piloteId; }

    public String getPiloteNom() { return piloteNom; }
    public void setPiloteNom(String piloteNom) { this.piloteNom = piloteNom; }

    public LocalDateTime getDateDecision() { return dateDecision; }
    public void setDateDecision(LocalDateTime dateDecision) { this.dateDecision = dateDecision; }
}
