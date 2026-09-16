package com.example.demo.dto;

/**
 * Lecture par l'IA d'un axe de pilotage (delai, charge, qualite, budget).
 */
public class AxeAnalyseIADTO {
    public static final String POSITIVE = "POSITIVE";
    public static final String STABLE = "STABLE";
    public static final String NEGATIVE = "NEGATIVE";

    private String axe;
    private String constat;
    private String tendance;

    public AxeAnalyseIADTO() {}

    public AxeAnalyseIADTO(String axe, String constat, String tendance) {
        this.axe = axe;
        this.constat = constat;
        this.tendance = tendance;
    }

    public String getAxe() { return axe; }
    public void setAxe(String axe) { this.axe = axe; }

    public String getConstat() { return constat; }
    public void setConstat(String constat) { this.constat = constat; }

    public String getTendance() { return tendance; }
    public void setTendance(String tendance) { this.tendance = tendance; }
}
