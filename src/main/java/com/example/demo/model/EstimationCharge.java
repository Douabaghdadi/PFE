package com.example.demo.model;

public class EstimationCharge {
    private String prestations;
    private String profil;
    private String periode; // délais
    private String chargeHM;
    private String livrables;

    public EstimationCharge() {}

    public EstimationCharge(String prestations, String profil, String periode, String chargeHM, String livrables) {
        this.prestations = prestations;
        this.profil = profil;
        this.periode = periode;
        this.chargeHM = chargeHM;
        this.livrables = livrables;
    }

    // Getters and Setters
    public String getPrestations() {
        return prestations;
    }

    public void setPrestations(String prestations) {
        this.prestations = prestations;
    }

    public String getProfil() {
        return profil;
    }

    public void setProfil(String profil) {
        this.profil = profil;
    }

    public String getPeriode() {
        return periode;
    }

    public void setPeriode(String periode) {
        this.periode = periode;
    }

    public String getChargeHM() {
        return chargeHM;
    }

    public void setChargeHM(String chargeHM) {
        this.chargeHM = chargeHM;
    }

    public String getLivrables() {
        return livrables;
    }

    public void setLivrables(String livrables) {
        this.livrables = livrables;
    }
}
