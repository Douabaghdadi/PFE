package com.example.demo.dto;

import com.example.demo.model.FicheSuivi.IndicateurPerformance;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public class FicheSuiviRequest {
    @NotBlank
    private String ficheProjetId;

    private LocalDate dateSuivi;

    private String avancement;

    private String problemesRencontres;

    private String decisionsPrises;

    private List<IndicateurPerformance> indicateurs;

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
}
