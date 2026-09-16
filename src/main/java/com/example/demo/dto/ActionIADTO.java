package com.example.demo.dto;

/**
 * Action corrective proposee par l'IA, priorisee et rattachee a un effet attendu.
 */
public class ActionIADTO {
    private int priorite;
    private String titre;
    private String description;
    private String impactAttendu;
    private String delai;

    public ActionIADTO() {}

    public int getPriorite() { return priorite; }
    public void setPriorite(int priorite) { this.priorite = priorite; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImpactAttendu() { return impactAttendu; }
    public void setImpactAttendu(String impactAttendu) { this.impactAttendu = impactAttendu; }

    public String getDelai() { return delai; }
    public void setDelai(String delai) { this.delai = delai; }
}
