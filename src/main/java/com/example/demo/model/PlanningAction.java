package com.example.demo.model;

import java.util.Map;

public class PlanningAction {
    private String action;
    private String profilIntervenants; // CP, ID, CMIP, CMU
    private String chargeHM;
    private Map<String, Boolean> mois; // mois 1-12 avec true/false pour indiquer si l'action est prévue

    public PlanningAction() {}

    public PlanningAction(String action, String profilIntervenants, String chargeHM, Map<String, Boolean> mois) {
        this.action = action;
        this.profilIntervenants = profilIntervenants;
        this.chargeHM = chargeHM;
        this.mois = mois;
    }

    // Getters and Setters
    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getProfilIntervenants() {
        return profilIntervenants;
    }

    public void setProfilIntervenants(String profilIntervenants) {
        this.profilIntervenants = profilIntervenants;
    }

    public String getChargeHM() {
        return chargeHM;
    }

    public void setChargeHM(String chargeHM) {
        this.chargeHM = chargeHM;
    }

    public Map<String, Boolean> getMois() {
        return mois;
    }

    public void setMois(Map<String, Boolean> mois) {
        this.mois = mois;
    }
}
