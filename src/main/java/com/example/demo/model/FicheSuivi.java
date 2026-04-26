package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "fiches_suivi")
public class FicheSuivi {
    @Id
    private String id;

    @NotBlank
    private String ficheProjetId;

    private LocalDate dateSuivi;

    private String avancement;

    private String problemesRencontres;

    private String decisionsPrises;

    private List<IndicateurPerformance> indicateurs = new ArrayList<>();

    private String chefProjetId;

    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    public FicheSuivi() {
        this.dateCreation = LocalDateTime.now();
        this.dateSuivi = LocalDate.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFicheProjetId() {
        return ficheProjetId;
    }

    public void setFicheProjetId(String ficheProjetId) {
        this.ficheProjetId = ficheProjetId;
    }

    public LocalDate getDateSuivi() {
        return dateSuivi;
    }

    public void setDateSuivi(LocalDate dateSuivi) {
        this.dateSuivi = dateSuivi;
    }

    public String getAvancement() {
        return avancement;
    }

    public void setAvancement(String avancement) {
        this.avancement = avancement;
    }

    public String getProblemesRencontres() {
        return problemesRencontres;
    }

    public void setProblemesRencontres(String problemesRencontres) {
        this.problemesRencontres = problemesRencontres;
    }

    public String getDecisionsPrises() {
        return decisionsPrises;
    }

    public void setDecisionsPrises(String decisionsPrises) {
        this.decisionsPrises = decisionsPrises;
    }

    public List<IndicateurPerformance> getIndicateurs() {
        return indicateurs;
    }

    public void setIndicateurs(List<IndicateurPerformance> indicateurs) {
        this.indicateurs = indicateurs;
    }

    public String getChefProjetId() {
        return chefProjetId;
    }

    public void setChefProjetId(String chefProjetId) {
        this.chefProjetId = chefProjetId;
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

    // Classe interne pour les indicateurs de performance
    public static class IndicateurPerformance {
        private String nom;
        private String valeur;
        private String unite;

        public IndicateurPerformance() {}

        public IndicateurPerformance(String nom, String valeur, String unite) {
            this.nom = nom;
            this.valeur = valeur;
            this.unite = unite;
        }

        public String getNom() {
            return nom;
        }

        public void setNom(String nom) {
            this.nom = nom;
        }

        public String getValeur() {
            return valeur;
        }

        public void setValeur(String valeur) {
            this.valeur = valeur;
        }

        public String getUnite() {
            return unite;
        }

        public void setUnite(String unite) {
            this.unite = unite;
        }
    }
}
