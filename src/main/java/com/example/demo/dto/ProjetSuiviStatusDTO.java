package com.example.demo.dto;

import java.time.LocalDate;

public class ProjetSuiviStatusDTO {
    private String projetId;
    private String nomProjet;
    private LocalDate dateDerniereFicheSuivi;
    private LocalDate dateProchaineFicheSuivi;
    private boolean ficheSuiviEnRetard;
    private int joursRetard;

    public ProjetSuiviStatusDTO() {
    }

    public String getProjetId() {
        return projetId;
    }

    public void setProjetId(String projetId) {
        this.projetId = projetId;
    }

    public String getNomProjet() {
        return nomProjet;
    }

    public void setNomProjet(String nomProjet) {
        this.nomProjet = nomProjet;
    }

    public LocalDate getDateDerniereFicheSuivi() {
        return dateDerniereFicheSuivi;
    }

    public void setDateDerniereFicheSuivi(LocalDate dateDerniereFicheSuivi) {
        this.dateDerniereFicheSuivi = dateDerniereFicheSuivi;
    }

    public LocalDate getDateProchaineFicheSuivi() {
        return dateProchaineFicheSuivi;
    }

    public void setDateProchaineFicheSuivi(LocalDate dateProchaineFicheSuivi) {
        this.dateProchaineFicheSuivi = dateProchaineFicheSuivi;
    }

    public boolean isFicheSuiviEnRetard() {
        return ficheSuiviEnRetard;
    }

    public void setFicheSuiviEnRetard(boolean ficheSuiviEnRetard) {
        this.ficheSuiviEnRetard = ficheSuiviEnRetard;
    }

    public int getJoursRetard() {
        return joursRetard;
    }

    public void setJoursRetard(int joursRetard) {
        this.joursRetard = joursRetard;
    }
}
