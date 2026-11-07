package com.example.demo.model;

/** Décision du pilote qualité sur une fiche. Une fiche déposée ou modifiée attend sa décision. */
public enum StatutValidation {
    A_VALIDER("À valider"),
    VALIDEE("Validée"),
    A_CORRIGER("À corriger");

    private final String libelle;

    StatutValidation(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
