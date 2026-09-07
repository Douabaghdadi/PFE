package com.example.demo.dto;

public class TeamSuggestionRequest {
    private String typeProjet;       // Nouveau, Evolution, Refonte
    private String budgetMDH;        // ex: "2.5"
    private Integer dureeEnMois;     // ex: 12
    private String complexite;       // FAIBLE, MOYENNE, ELEVEE
    private String description;      // description courte du projet
    private String modaliteDeveloppement; // interne, ST, CO, Co-traitance

    public String getTypeProjet() { return typeProjet; }
    public void setTypeProjet(String typeProjet) { this.typeProjet = typeProjet; }

    public String getBudgetMDH() { return budgetMDH; }
    public void setBudgetMDH(String budgetMDH) { this.budgetMDH = budgetMDH; }

    public Integer getDureeEnMois() { return dureeEnMois; }
    public void setDureeEnMois(Integer dureeEnMois) { this.dureeEnMois = dureeEnMois; }

    public String getComplexite() { return complexite; }
    public void setComplexite(String complexite) { this.complexite = complexite; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getModaliteDeveloppement() { return modaliteDeveloppement; }
    public void setModaliteDeveloppement(String modaliteDeveloppement) { this.modaliteDeveloppement = modaliteDeveloppement; }
}
