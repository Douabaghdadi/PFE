package com.example.demo.dto;

import com.example.demo.model.FicheSuivi.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public class FicheSuiviRequest {
    @NotBlank
    private String ficheProjetId;
    
    private String numeroRapport;
    private LocalDate dateRapport;

    private FicheSignaletique ficheSignaletique;
    private ConstatGlobal constatGlobal;
    private List<TacheSuivi> tachesSuivi;
    private PlanningActuel planningActuel;

    // Getters and Setters
    public String getFicheProjetId() { return ficheProjetId; }
    public void setFicheProjetId(String ficheProjetId) { this.ficheProjetId = ficheProjetId; }

    public String getNumeroRapport() { return numeroRapport; }
    public void setNumeroRapport(String numeroRapport) { this.numeroRapport = numeroRapport; }

    public LocalDate getDateRapport() { return dateRapport; }
    public void setDateRapport(LocalDate dateRapport) { this.dateRapport = dateRapport; }

    public FicheSignaletique getFicheSignaletique() { return ficheSignaletique; }
    public void setFicheSignaletique(FicheSignaletique ficheSignaletique) { this.ficheSignaletique = ficheSignaletique; }

    public ConstatGlobal getConstatGlobal() { return constatGlobal; }
    public void setConstatGlobal(ConstatGlobal constatGlobal) { this.constatGlobal = constatGlobal; }

    public List<TacheSuivi> getTachesSuivi() { return tachesSuivi; }
    public void setTachesSuivi(List<TacheSuivi> tachesSuivi) { this.tachesSuivi = tachesSuivi; }

    public PlanningActuel getPlanningActuel() { return planningActuel; }
    public void setPlanningActuel(PlanningActuel planningActuel) { this.planningActuel = planningActuel; }
}
