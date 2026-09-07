package com.example.demo.dto;

import java.util.List;

public class TeamSuggestionResponse {
    private boolean success;
    private String errorMessage;

    private Integer tailleEquipeRecommandee;
    private List<ProfilRecommande> profils;
    private List<String> membresRecommandes;
    private String justification;
    private String facteursCles;
    private String risquesEquipe;
    private String projetsSimilairesAnalyses;

    public static class ProfilRecommande {
        private String role;
        private Integer nombrePersonnes;
        private String competencesRequises;

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public Integer getNombrePersonnes() { return nombrePersonnes; }
        public void setNombrePersonnes(Integer nombrePersonnes) { this.nombrePersonnes = nombrePersonnes; }

        public String getCompetencesRequises() { return competencesRequises; }
        public void setCompetencesRequises(String competencesRequises) { this.competencesRequises = competencesRequises; }
    }

    public TeamSuggestionResponse() { this.success = true; }

    public TeamSuggestionResponse(String errorMessage) {
        this.success = false;
        this.errorMessage = errorMessage;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Integer getTailleEquipeRecommandee() { return tailleEquipeRecommandee; }
    public void setTailleEquipeRecommandee(Integer tailleEquipeRecommandee) { this.tailleEquipeRecommandee = tailleEquipeRecommandee; }

    public List<ProfilRecommande> getProfils() { return profils; }
    public void setProfils(List<ProfilRecommande> profils) { this.profils = profils; }

    public List<String> getMembresRecommandes() { return membresRecommandes; }
    public void setMembresRecommandes(List<String> membresRecommandes) { this.membresRecommandes = membresRecommandes; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public String getFacteursCles() { return facteursCles; }
    public void setFacteursCles(String facteursCles) { this.facteursCles = facteursCles; }

    public String getRisquesEquipe() { return risquesEquipe; }
    public void setRisquesEquipe(String risquesEquipe) { this.risquesEquipe = risquesEquipe; }

    public String getProjetsSimilairesAnalyses() { return projetsSimilairesAnalyses; }
    public void setProjetsSimilairesAnalyses(String projetsSimilairesAnalyses) { this.projetsSimilairesAnalyses = projetsSimilairesAnalyses; }
}
