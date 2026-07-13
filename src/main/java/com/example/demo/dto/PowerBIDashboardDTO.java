package com.example.demo.dto;

import java.time.LocalDate;
import java.util.List;

public class PowerBIDashboardDTO {
    
    // Statistiques globales
    private int totalProjets;
    private int projetsEnCours;
    private int projetsTermines;
    private int projetsEnAttente;
    private int projetsAnnules;
    private double budgetTotal;
    private double tauxAvancementMoyen;
    
    // Projets par statut
    private List<ProjetParStatut> projetsByStatut;
    
    // Projets par mois
    private List<ProjetParMois> projetsByMois;
    
    // Projets par type
    private List<ProjetParType> projetsByType;
    
    // Projets par caractère
    private List<ProjetParCaractere> projetsByCaractere;
    
    // Budget par projet
    private List<BudgetParProjet> budgetByProjet;
    
    // Charge de travail
    private List<ChargeParMembre> chargeByMembre;
    
    // KPIs Qualité (pour pilote qualité)
    private int totalFichesSuivi;
    private int fichesConformes;
    private int fichesNonConformes;
    private double tauxConformite;
    
    // Classes internes pour les données groupées
    public static class ProjetParStatut {
        private String statut;
        private long count;
        
        public ProjetParStatut() {}
        
        public ProjetParStatut(String statut, long count) {
            this.statut = statut;
            this.count = count;
        }
        
        // Getters et Setters
        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
    
    public static class ProjetParMois {
        private String mois;
        private int annee;
        private long count;
        
        public ProjetParMois() {}
        
        public ProjetParMois(String mois, int annee, long count) {
            this.mois = mois;
            this.annee = annee;
            this.count = count;
        }
        
        // Getters et Setters
        public String getMois() { return mois; }
        public void setMois(String mois) { this.mois = mois; }
        public int getAnnee() { return annee; }
        public void setAnnee(int annee) { this.annee = annee; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
    
    public static class ProjetParType {
        private String type;
        private long count;
        
        public ProjetParType() {}
        
        public ProjetParType(String type, long count) {
            this.type = type;
            this.count = count;
        }
        
        // Getters et Setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
    
    public static class ProjetParCaractere {
        private String caractere;
        private long count;
        
        public ProjetParCaractere() {}
        
        public ProjetParCaractere(String caractere, long count) {
            this.caractere = caractere;
            this.count = count;
        }
        
        // Getters et Setters
        public String getCaractere() { return caractere; }
        public void setCaractere(String caractere) { this.caractere = caractere; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
    
    public static class BudgetParProjet {
        private String nomProjet;
        private double budget;
        private String statut;
        
        public BudgetParProjet() {}
        
        public BudgetParProjet(String nomProjet, double budget, String statut) {
            this.nomProjet = nomProjet;
            this.budget = budget;
            this.statut = statut;
        }
        
        // Getters et Setters
        public String getNomProjet() { return nomProjet; }
        public void setNomProjet(String nomProjet) { this.nomProjet = nomProjet; }
        public double getBudget() { return budget; }
        public void setBudget(double budget) { this.budget = budget; }
        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }
    }
    
    public static class ChargeParMembre {
        private String nomMembre;
        private String role;
        private double chargeHM;
        private int nombreProjets;
        
        public ChargeParMembre() {}
        
        public ChargeParMembre(String nomMembre, String role, double chargeHM, int nombreProjets) {
            this.nomMembre = nomMembre;
            this.role = role;
            this.chargeHM = chargeHM;
            this.nombreProjets = nombreProjets;
        }
        
        // Getters et Setters
        public String getNomMembre() { return nomMembre; }
        public void setNomMembre(String nomMembre) { this.nomMembre = nomMembre; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public double getChargeHM() { return chargeHM; }
        public void setChargeHM(double chargeHM) { this.chargeHM = chargeHM; }
        public int getNombreProjets() { return nombreProjets; }
        public void setNombreProjets(int nombreProjets) { this.nombreProjets = nombreProjets; }
    }
    
    // Getters et Setters principaux
    public int getTotalProjets() { return totalProjets; }
    public void setTotalProjets(int totalProjets) { this.totalProjets = totalProjets; }
    
    public int getProjetsEnCours() { return projetsEnCours; }
    public void setProjetsEnCours(int projetsEnCours) { this.projetsEnCours = projetsEnCours; }
    
    public int getProjetsTermines() { return projetsTermines; }
    public void setProjetsTermines(int projetsTermines) { this.projetsTermines = projetsTermines; }
    
    public int getProjetsEnAttente() { return projetsEnAttente; }
    public void setProjetsEnAttente(int projetsEnAttente) { this.projetsEnAttente = projetsEnAttente; }
    
    public int getProjetsAnnules() { return projetsAnnules; }
    public void setProjetsAnnules(int projetsAnnules) { this.projetsAnnules = projetsAnnules; }
    
    public double getBudgetTotal() { return budgetTotal; }
    public void setBudgetTotal(double budgetTotal) { this.budgetTotal = budgetTotal; }
    
    public double getTauxAvancementMoyen() { return tauxAvancementMoyen; }
    public void setTauxAvancementMoyen(double tauxAvancementMoyen) { this.tauxAvancementMoyen = tauxAvancementMoyen; }
    
    public List<ProjetParStatut> getProjetsByStatut() { return projetsByStatut; }
    public void setProjetsByStatut(List<ProjetParStatut> projetsByStatut) { this.projetsByStatut = projetsByStatut; }
    
    public List<ProjetParMois> getProjetsByMois() { return projetsByMois; }
    public void setProjetsByMois(List<ProjetParMois> projetsByMois) { this.projetsByMois = projetsByMois; }
    
    public List<ProjetParType> getProjetsByType() { return projetsByType; }
    public void setProjetsByType(List<ProjetParType> projetsByType) { this.projetsByType = projetsByType; }
    
    public List<ProjetParCaractere> getProjetsByCaractere() { return projetsByCaractere; }
    public void setProjetsByCaractere(List<ProjetParCaractere> projetsByCaractere) { this.projetsByCaractere = projetsByCaractere; }
    
    public List<BudgetParProjet> getBudgetByProjet() { return budgetByProjet; }
    public void setBudgetByProjet(List<BudgetParProjet> budgetByProjet) { this.budgetByProjet = budgetByProjet; }
    
    public List<ChargeParMembre> getChargeByMembre() { return chargeByMembre; }
    public void setChargeByMembre(List<ChargeParMembre> chargeByMembre) { this.chargeByMembre = chargeByMembre; }
    
    public int getTotalFichesSuivi() { return totalFichesSuivi; }
    public void setTotalFichesSuivi(int totalFichesSuivi) { this.totalFichesSuivi = totalFichesSuivi; }
    
    public int getFichesConformes() { return fichesConformes; }
    public void setFichesConformes(int fichesConformes) { this.fichesConformes = fichesConformes; }
    
    public int getFichesNonConformes() { return fichesNonConformes; }
    public void setFichesNonConformes(int fichesNonConformes) { this.fichesNonConformes = fichesNonConformes; }
    
    public double getTauxConformite() { return tauxConformite; }
    public void setTauxConformite(double tauxConformite) { this.tauxConformite = tauxConformite; }
}
