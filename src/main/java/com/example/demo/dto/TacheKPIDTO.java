package com.example.demo.dto;

/**
 * Tâche remontée dans les KPI (retard, échéance proche, charge dérivée).
 */
public class TacheKPIDTO {
    private String code;
    private String sujet;
    private String assigneA;
    private String echeance;
    private int pourcentageRealise;
    private String statut;
    private int joursEcart; // > 0 : jours de retard ; < 0 : jours restants avant échéance

    public TacheKPIDTO() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSujet() { return sujet; }
    public void setSujet(String sujet) { this.sujet = sujet; }

    public String getAssigneA() { return assigneA; }
    public void setAssigneA(String assigneA) { this.assigneA = assigneA; }

    public String getEcheance() { return echeance; }
    public void setEcheance(String echeance) { this.echeance = echeance; }

    public int getPourcentageRealise() { return pourcentageRealise; }
    public void setPourcentageRealise(int pourcentageRealise) { this.pourcentageRealise = pourcentageRealise; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public int getJoursEcart() { return joursEcart; }
    public void setJoursEcart(int joursEcart) { this.joursEcart = joursEcart; }
}
