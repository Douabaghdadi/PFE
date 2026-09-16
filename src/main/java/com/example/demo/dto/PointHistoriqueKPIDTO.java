package com.example.demo.dto;

/**
 * Point de mesure issu d'une fiche de suivi : permet de tracer l'évolution du projet.
 */
public class PointHistoriqueKPIDTO {
    private String date;
    private String numeroRapport;
    private double tauxAvancement;
    private int nombreProblemes;
    private int nombreRisques;

    public PointHistoriqueKPIDTO() {}

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getNumeroRapport() { return numeroRapport; }
    public void setNumeroRapport(String numeroRapport) { this.numeroRapport = numeroRapport; }

    public double getTauxAvancement() { return tauxAvancement; }
    public void setTauxAvancement(double tauxAvancement) { this.tauxAvancement = tauxAvancement; }

    public int getNombreProblemes() { return nombreProblemes; }
    public void setNombreProblemes(int nombreProblemes) { this.nombreProblemes = nombreProblemes; }

    public int getNombreRisques() { return nombreRisques; }
    public void setNombreRisques(int nombreRisques) { this.nombreRisques = nombreRisques; }
}
