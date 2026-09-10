package com.example.demo.dto;

import java.util.List;

public class ProjetKPIReportDTO {
    // Informations du projet
    private String projetId;
    private String nomProjet;
    private String statut;
    private String dateDebut;
    private String dateFinPrevue;
    private String dateFinReelle;
    
    // KPI de performance
    private double tauxAvancement;
    private int joursRetard;
    
    // KPI de qualité
    private int nombreProblemes;
    private int nombreRisques;
    private List<String> listeProblemes;
    private List<String> listeRisques;
    
    // KPI budgétaires
    private double budgetTotal;
    private double budgetMateriel;
    private double budgetLogiciel;
    private double budgetRessourcesHumaines;
    
    // KPI d'équipe
    private int tailleEquipe;
    private List<MembreEquipeDTO> listeMembresEquipe;

    // Constructeurs
    public ProjetKPIReportDTO() {
    }

    // Getters et Setters
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

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(String dateDebut) {
        this.dateDebut = dateDebut;
    }

    public String getDateFinPrevue() {
        return dateFinPrevue;
    }

    public void setDateFinPrevue(String dateFinPrevue) {
        this.dateFinPrevue = dateFinPrevue;
    }

    public String getDateFinReelle() {
        return dateFinReelle;
    }

    public void setDateFinReelle(String dateFinReelle) {
        this.dateFinReelle = dateFinReelle;
    }

    public double getTauxAvancement() {
        return tauxAvancement;
    }

    public void setTauxAvancement(double tauxAvancement) {
        this.tauxAvancement = tauxAvancement;
    }

    public int getJoursRetard() {
        return joursRetard;
    }

    public void setJoursRetard(int joursRetard) {
        this.joursRetard = joursRetard;
    }

    public int getNombreProblemes() {
        return nombreProblemes;
    }

    public void setNombreProblemes(int nombreProblemes) {
        this.nombreProblemes = nombreProblemes;
    }

    public int getNombreRisques() {
        return nombreRisques;
    }

    public void setNombreRisques(int nombreRisques) {
        this.nombreRisques = nombreRisques;
    }

    public List<String> getListeProblemes() {
        return listeProblemes;
    }

    public void setListeProblemes(List<String> listeProblemes) {
        this.listeProblemes = listeProblemes;
    }

    public List<String> getListeRisques() {
        return listeRisques;
    }

    public void setListeRisques(List<String> listeRisques) {
        this.listeRisques = listeRisques;
    }

    public double getBudgetTotal() {
        return budgetTotal;
    }

    public void setBudgetTotal(double budgetTotal) {
        this.budgetTotal = budgetTotal;
    }

    public double getBudgetMateriel() {
        return budgetMateriel;
    }

    public void setBudgetMateriel(double budgetMateriel) {
        this.budgetMateriel = budgetMateriel;
    }

    public double getBudgetLogiciel() {
        return budgetLogiciel;
    }

    public void setBudgetLogiciel(double budgetLogiciel) {
        this.budgetLogiciel = budgetLogiciel;
    }

    public double getBudgetRessourcesHumaines() {
        return budgetRessourcesHumaines;
    }

    public void setBudgetRessourcesHumaines(double budgetRessourcesHumaines) {
        this.budgetRessourcesHumaines = budgetRessourcesHumaines;
    }

    public int getTailleEquipe() {
        return tailleEquipe;
    }

    public void setTailleEquipe(int tailleEquipe) {
        this.tailleEquipe = tailleEquipe;
    }

    public List<MembreEquipeDTO> getListeMembresEquipe() {
        return listeMembresEquipe;
    }

    public void setListeMembresEquipe(List<MembreEquipeDTO> listeMembresEquipe) {
        this.listeMembresEquipe = listeMembresEquipe;
    }
}
