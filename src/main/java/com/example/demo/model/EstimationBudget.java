package com.example.demo.model;

public class EstimationBudget {
    private String profils;
    private String chargeParProfilHM;
    private String budgetMDHT;
    private String cp; // Chef de Projet
    private String id; // Ingénieur Développeur
    private String total;

    public EstimationBudget() {}

    // Getters and Setters
    public String getProfils() {
        return profils;
    }

    public void setProfils(String profils) {
        this.profils = profils;
    }

    public String getChargeParProfilHM() {
        return chargeParProfilHM;
    }

    public void setChargeParProfilHM(String chargeParProfilHM) {
        this.chargeParProfilHM = chargeParProfilHM;
    }

    public String getBudgetMDHT() {
        return budgetMDHT;
    }

    public void setBudgetMDHT(String budgetMDHT) {
        this.budgetMDHT = budgetMDHT;
    }

    public String getCp() {
        return cp;
    }

    public void setCp(String cp) {
        this.cp = cp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTotal() {
        return total;
    }

    public void setTotal(String total) {
        this.total = total;
    }
}
