package com.example.demo.dto;

import java.util.Map;

public class KPIReportDTO {
    // Statistiques générales
    private int totalProjets;
    private int projetsEnCours;
    private int projetsTermines;
    private int projetsEnAttente;
    private int projetsAnnules;
    private int totalFichesSuivi;
    
    // KPI de performance
    private double tauxCompletion;
    private double tauxProjetsEnCours;
    private int projetsEnRetard;
    
    // KPI de qualité
    private int totalTaches;
    private int totalProblemes;
    private int totalRisques;
    private double moyenneTachesParProjet;
    private double moyenneProblemsParProjet;
    
    // KPI budgétaires
    private double budgetTotal;
    private double budgetMoyen;
    
    // Répartition par type
    private Map<String, Integer> repartitionParType;
    
    // Répartition par statut
    private Map<String, Integer> repartitionParStatut;
    
    // Date de génération
    private String dateGeneration;

    // Constructeurs
    public KPIReportDTO() {
    }

    // Getters et Setters
    public int getTotalProjets() {
        return totalProjets;
    }

    public void setTotalProjets(int totalProjets) {
        this.totalProjets = totalProjets;
    }

    public int getProjetsEnCours() {
        return projetsEnCours;
    }

    public void setProjetsEnCours(int projetsEnCours) {
        this.projetsEnCours = projetsEnCours;
    }

    public int getProjetsTermines() {
        return projetsTermines;
    }

    public void setProjetsTermines(int projetsTermines) {
        this.projetsTermines = projetsTermines;
    }

    public int getProjetsEnAttente() {
        return projetsEnAttente;
    }

    public void setProjetsEnAttente(int projetsEnAttente) {
        this.projetsEnAttente = projetsEnAttente;
    }

    public int getProjetsAnnules() {
        return projetsAnnules;
    }

    public void setProjetsAnnules(int projetsAnnules) {
        this.projetsAnnules = projetsAnnules;
    }

    public int getTotalFichesSuivi() {
        return totalFichesSuivi;
    }

    public void setTotalFichesSuivi(int totalFichesSuivi) {
        this.totalFichesSuivi = totalFichesSuivi;
    }

    public double getTauxCompletion() {
        return tauxCompletion;
    }

    public void setTauxCompletion(double tauxCompletion) {
        this.tauxCompletion = tauxCompletion;
    }

    public double getTauxProjetsEnCours() {
        return tauxProjetsEnCours;
    }

    public void setTauxProjetsEnCours(double tauxProjetsEnCours) {
        this.tauxProjetsEnCours = tauxProjetsEnCours;
    }

    public int getProjetsEnRetard() {
        return projetsEnRetard;
    }

    public void setProjetsEnRetard(int projetsEnRetard) {
        this.projetsEnRetard = projetsEnRetard;
    }

    public int getTotalTaches() {
        return totalTaches;
    }

    public void setTotalTaches(int totalTaches) {
        this.totalTaches = totalTaches;
    }

    public int getTotalProblemes() {
        return totalProblemes;
    }

    public void setTotalProblemes(int totalProblemes) {
        this.totalProblemes = totalProblemes;
    }

    public int getTotalRisques() {
        return totalRisques;
    }

    public void setTotalRisques(int totalRisques) {
        this.totalRisques = totalRisques;
    }

    public double getMoyenneTachesParProjet() {
        return moyenneTachesParProjet;
    }

    public void setMoyenneTachesParProjet(double moyenneTachesParProjet) {
        this.moyenneTachesParProjet = moyenneTachesParProjet;
    }

    public double getMoyenneProblemsParProjet() {
        return moyenneProblemsParProjet;
    }

    public void setMoyenneProblemsParProjet(double moyenneProblemsParProjet) {
        this.moyenneProblemsParProjet = moyenneProblemsParProjet;
    }

    public double getBudgetTotal() {
        return budgetTotal;
    }

    public void setBudgetTotal(double budgetTotal) {
        this.budgetTotal = budgetTotal;
    }

    public double getBudgetMoyen() {
        return budgetMoyen;
    }

    public void setBudgetMoyen(double budgetMoyen) {
        this.budgetMoyen = budgetMoyen;
    }

    public Map<String, Integer> getRepartitionParType() {
        return repartitionParType;
    }

    public void setRepartitionParType(Map<String, Integer> repartitionParType) {
        this.repartitionParType = repartitionParType;
    }

    public Map<String, Integer> getRepartitionParStatut() {
        return repartitionParStatut;
    }

    public void setRepartitionParStatut(Map<String, Integer> repartitionParStatut) {
        this.repartitionParStatut = repartitionParStatut;
    }

    public String getDateGeneration() {
        return dateGeneration;
    }

    public void setDateGeneration(String dateGeneration) {
        this.dateGeneration = dateGeneration;
    }
}
