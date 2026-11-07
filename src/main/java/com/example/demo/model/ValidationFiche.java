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
    /** Reste vrai après une modification : sinon, une simple retouche lèverait l'interdiction de supprimer. */
    private boolean dejaValidee;

    public void valider(String piloteId, String piloteNom) {
        if (statut != StatutValidation.A_VALIDER) {
            throw new IllegalStateException("Cette fiche n'est plus à valider : rechargez la page pour voir son état.");
        }
        dejaValidee = true;
        enregistrerDecision(StatutValidation.VALIDEE, null, piloteId, piloteNom);
    }

    /** Reste possible sur une fiche validée : une fois corrigée, elle devra être validée de nouveau. */
    public void demanderCorrection(String motif, String piloteId, String piloteNom) {
        if (statut == StatutValidation.A_CORRIGER) {
            throw new IllegalStateException("Une correction est déjà demandée sur cette fiche.");
        }
        dejaValidee = isDejaValidee();
        enregistrerDecision(StatutValidation.A_CORRIGER, motif, piloteId, piloteNom);
    }

    /** Une fiche validée une fois ne se supprime plus, même si son chef l'a modifiée depuis. */
    public void verifierSupprimable() {
        if (isDejaValidee()) {
            throw new IllegalStateException("Cette fiche a été validée par le pilote qualité : elle ne peut plus être supprimée.");
        }
    }

    /** Une décision porte sur un contenu : dès que le chef de projet le change, elle ne vaut plus. */
    public void remettreAValider() {
        dejaValidee = isDejaValidee();
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

    /** Une fiche validée avant l'ajout de ce champ ne l'a pas en base : son statut suffit. */
    public boolean isDejaValidee() { return dejaValidee || statut == StatutValidation.VALIDEE; }
    public void setDejaValidee(boolean dejaValidee) { this.dejaValidee = dejaValidee; }

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
