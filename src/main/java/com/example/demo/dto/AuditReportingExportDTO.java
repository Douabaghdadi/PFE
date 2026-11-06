package com.example.demo.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Audit du reporting tel que l'affiche le tableau de bord du pilote qualité, envoyé par la page pour
 * l'export Excel : les indicateurs du haut de page et une ligne par projet suivi.
 */
public class AuditReportingExportDTO {
    private int nbProjets;
    private int nbFichesDeposees;
    private int tauxConformite;
    private int nbEnRetard;
    private int nbJamaisSuivi;
    private int completudeMoyenne;
    private int nbRubriques;
    private int nbEcheances30j;
    private List<ProjetAudit> projets = new ArrayList<>();

    public int getNbProjets() { return nbProjets; }
    public void setNbProjets(int nbProjets) { this.nbProjets = nbProjets; }

    public int getNbFichesDeposees() { return nbFichesDeposees; }
    public void setNbFichesDeposees(int nbFichesDeposees) { this.nbFichesDeposees = nbFichesDeposees; }

    public int getTauxConformite() { return tauxConformite; }
    public void setTauxConformite(int tauxConformite) { this.tauxConformite = tauxConformite; }

    public int getNbEnRetard() { return nbEnRetard; }
    public void setNbEnRetard(int nbEnRetard) { this.nbEnRetard = nbEnRetard; }

    public int getNbJamaisSuivi() { return nbJamaisSuivi; }
    public void setNbJamaisSuivi(int nbJamaisSuivi) { this.nbJamaisSuivi = nbJamaisSuivi; }

    public int getCompletudeMoyenne() { return completudeMoyenne; }
    public void setCompletudeMoyenne(int completudeMoyenne) { this.completudeMoyenne = completudeMoyenne; }

    public int getNbRubriques() { return nbRubriques; }
    public void setNbRubriques(int nbRubriques) { this.nbRubriques = nbRubriques; }

    public int getNbEcheances30j() { return nbEcheances30j; }
    public void setNbEcheances30j(int nbEcheances30j) { this.nbEcheances30j = nbEcheances30j; }

    public List<ProjetAudit> getProjets() { return projets; }
    public void setProjets(List<ProjetAudit> projets) { this.projets = projets != null ? projets : new ArrayList<>(); }

    /** Une ligne de l'audit : la situation de reporting d'un projet. */
    public static class ProjetAudit {
        private String nom;
        private String statut;
        private String chefProjet;
        /** Libellé lisible : « Suivi à jour », « Fiche en retard », « Jamais suivi ». */
        private String conformite;
        private int joursRetard;
        private Integer periodiciteMois;
        /** Dates au format AAAA-MM-JJ. */
        private String derniereFiche;
        private String prochaineEcheance;
        private int fichesDeposees;
        /** Complétude moyenne des fiches déposées, en pourcentage. */
        private int completude;
        private List<String> rubriquesManquantes = new ArrayList<>();

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }

        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }

        public String getChefProjet() { return chefProjet; }
        public void setChefProjet(String chefProjet) { this.chefProjet = chefProjet; }

        public String getConformite() { return conformite; }
        public void setConformite(String conformite) { this.conformite = conformite; }

        public int getJoursRetard() { return joursRetard; }
        public void setJoursRetard(int joursRetard) { this.joursRetard = joursRetard; }

        public Integer getPeriodiciteMois() { return periodiciteMois; }
        public void setPeriodiciteMois(Integer periodiciteMois) { this.periodiciteMois = periodiciteMois; }

        public String getDerniereFiche() { return derniereFiche; }
        public void setDerniereFiche(String derniereFiche) { this.derniereFiche = derniereFiche; }

        public String getProchaineEcheance() { return prochaineEcheance; }
        public void setProchaineEcheance(String prochaineEcheance) { this.prochaineEcheance = prochaineEcheance; }

        public int getFichesDeposees() { return fichesDeposees; }
        public void setFichesDeposees(int fichesDeposees) { this.fichesDeposees = fichesDeposees; }

        public int getCompletude() { return completude; }
        public void setCompletude(int completude) { this.completude = completude; }

        public List<String> getRubriquesManquantes() { return rubriquesManquantes; }
        public void setRubriquesManquantes(List<String> rubriquesManquantes) {
            this.rubriquesManquantes = rubriquesManquantes != null ? rubriquesManquantes : new ArrayList<>();
        }
    }
}
