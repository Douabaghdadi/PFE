package com.example.demo.dto;

/**
 * Alerte déduite des KPI (règles métier déterministes, sans IA).
 */
public class AlerteKPIDTO {
    public static final String CRITIQUE = "CRITIQUE";
    public static final String MAJEUR = "MAJEUR";
    public static final String MINEUR = "MINEUR";

    private String niveau;
    private String categorie;
    private String titre;
    private String message;

    public AlerteKPIDTO() {}

    public AlerteKPIDTO(String niveau, String categorie, String titre, String message) {
        this.niveau = niveau;
        this.categorie = categorie;
        this.titre = titre;
        this.message = message;
    }

    public String getNiveau() { return niveau; }
    public void setNiveau(String niveau) { this.niveau = niveau; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
