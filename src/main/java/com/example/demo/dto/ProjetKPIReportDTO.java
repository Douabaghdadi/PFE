package com.example.demo.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Rapport KPI d'un projet : indicateurs de delai, de charge, de qualite et de sante
 * consolides a partir de la fiche projet et de l'ensemble de ses fiches de suivi.
 */
public class ProjetKPIReportDTO {
    // Informations du projet
    private String projetId;
    private String nomProjet;
    private String statut;
    private String dateDebut;
    private String dateFinPrevue;
    private String dateFinReelle;

    // Couverture du suivi
    private int nombreFichesSuivi;
    private String dateDerniereFiche;
    private String numeroDerniereFiche;

    // KPI de performance
    private double tauxAvancement;          // avancement réel pondéré par la charge
    private double tauxAvancementPlanifie;  // avancement attendu à ce jour
    private double ecartPlanning;           // réel - planifié (en points de %)
    private double spi;                     // Schedule Performance Index (réel / planifié)
    private int joursRetard;                // retard constaté sur la date de fin prévue
    private String dateFinProjetee;         // date de fin extrapolée depuis la vélocité observée
    private int joursDerapageProjete;       // écart projeté vs date de fin prévue
    private double deltaAvancement;         // évolution depuis la fiche de suivi précédente

    // KPI de tâches
    private int totalTaches;
    private int tachesTerminees;
    private int tachesEnCours;
    private int tachesNonDemarrees;
    private int tachesEnRetard;
    private int tachesEcheanceProche;
    private double tauxRespectEcheances;
    private List<TacheKPIDTO> listeTachesEnRetard = new ArrayList<>();
    private List<TacheKPIDTO> listeTachesEcheanceProche = new ArrayList<>();

    // KPI de charge
    private double chargeEstimee;
    private double chargeConsommee;
    private double chargeRestanteEstimee;
    private double tauxConsommationCharge;
    private double indiceEfficacite;        // CPI : valeur acquise / charge consommée

    // KPI de qualité
    private int nombreProblemes;
    private int nombreRisques;
    private int nombreRecommandations;
    private int nombreProblemesPersistants;  // problèmes déjà signalés dans la fiche précédente
    private List<String> listeProblemes = new ArrayList<>();
    private List<String> listeRisques = new ArrayList<>();
    private List<String> listeRecommandations = new ArrayList<>();

    // KPI budgétaires
    private double budgetTotal;        // budget cadré dans la fiche projet (MD = millions de dinars)
    private double budgetPrevision;    // budget prévu remonté par la dernière fiche de suivi
    private double budgetRealisation;  // budget consommé
    private double ecartBudget;
    private double tauxConsommationBudget;

    // KPI d'équipe
    private int tailleEquipe;
    private List<MembreEquipeDTO> listeMembresEquipe = new ArrayList<>();
    private List<ChargeMembreDTO> chargeParMembre = new ArrayList<>();

    // Santé, alertes et historique
    private double scoreSante;
    private String niveauSante;
    private List<ComposanteScoreDTO> detailScore = new ArrayList<>();
    private List<AlerteKPIDTO> alertes = new ArrayList<>();
    private List<PointHistoriqueKPIDTO> historique = new ArrayList<>();

    public ProjetKPIReportDTO() {
    }

    public String getProjetId() { return projetId; }
    public void setProjetId(String projetId) { this.projetId = projetId; }

    public String getNomProjet() { return nomProjet; }
    public void setNomProjet(String nomProjet) { this.nomProjet = nomProjet; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public String getDateDebut() { return dateDebut; }
    public void setDateDebut(String dateDebut) { this.dateDebut = dateDebut; }

    public String getDateFinPrevue() { return dateFinPrevue; }
    public void setDateFinPrevue(String dateFinPrevue) { this.dateFinPrevue = dateFinPrevue; }

    public String getDateFinReelle() { return dateFinReelle; }
    public void setDateFinReelle(String dateFinReelle) { this.dateFinReelle = dateFinReelle; }

    public int getNombreFichesSuivi() { return nombreFichesSuivi; }
    public void setNombreFichesSuivi(int nombreFichesSuivi) { this.nombreFichesSuivi = nombreFichesSuivi; }

    public String getDateDerniereFiche() { return dateDerniereFiche; }
    public void setDateDerniereFiche(String dateDerniereFiche) { this.dateDerniereFiche = dateDerniereFiche; }

    public String getNumeroDerniereFiche() { return numeroDerniereFiche; }
    public void setNumeroDerniereFiche(String numeroDerniereFiche) { this.numeroDerniereFiche = numeroDerniereFiche; }

    public double getTauxAvancement() { return tauxAvancement; }
    public void setTauxAvancement(double tauxAvancement) { this.tauxAvancement = tauxAvancement; }

    public double getTauxAvancementPlanifie() { return tauxAvancementPlanifie; }
    public void setTauxAvancementPlanifie(double tauxAvancementPlanifie) { this.tauxAvancementPlanifie = tauxAvancementPlanifie; }

    public double getEcartPlanning() { return ecartPlanning; }
    public void setEcartPlanning(double ecartPlanning) { this.ecartPlanning = ecartPlanning; }

    public double getSpi() { return spi; }
    public void setSpi(double spi) { this.spi = spi; }

    public int getJoursRetard() { return joursRetard; }
    public void setJoursRetard(int joursRetard) { this.joursRetard = joursRetard; }

    public String getDateFinProjetee() { return dateFinProjetee; }
    public void setDateFinProjetee(String dateFinProjetee) { this.dateFinProjetee = dateFinProjetee; }

    public int getJoursDerapageProjete() { return joursDerapageProjete; }
    public void setJoursDerapageProjete(int joursDerapageProjete) { this.joursDerapageProjete = joursDerapageProjete; }

    public double getDeltaAvancement() { return deltaAvancement; }
    public void setDeltaAvancement(double deltaAvancement) { this.deltaAvancement = deltaAvancement; }

    public int getTotalTaches() { return totalTaches; }
    public void setTotalTaches(int totalTaches) { this.totalTaches = totalTaches; }

    public int getTachesTerminees() { return tachesTerminees; }
    public void setTachesTerminees(int tachesTerminees) { this.tachesTerminees = tachesTerminees; }

    public int getTachesEnCours() { return tachesEnCours; }
    public void setTachesEnCours(int tachesEnCours) { this.tachesEnCours = tachesEnCours; }

    public int getTachesNonDemarrees() { return tachesNonDemarrees; }
    public void setTachesNonDemarrees(int tachesNonDemarrees) { this.tachesNonDemarrees = tachesNonDemarrees; }

    public int getTachesEnRetard() { return tachesEnRetard; }
    public void setTachesEnRetard(int tachesEnRetard) { this.tachesEnRetard = tachesEnRetard; }

    public int getTachesEcheanceProche() { return tachesEcheanceProche; }
    public void setTachesEcheanceProche(int tachesEcheanceProche) { this.tachesEcheanceProche = tachesEcheanceProche; }

    public double getTauxRespectEcheances() { return tauxRespectEcheances; }
    public void setTauxRespectEcheances(double tauxRespectEcheances) { this.tauxRespectEcheances = tauxRespectEcheances; }

    public List<TacheKPIDTO> getListeTachesEnRetard() { return listeTachesEnRetard; }
    public void setListeTachesEnRetard(List<TacheKPIDTO> listeTachesEnRetard) { this.listeTachesEnRetard = listeTachesEnRetard; }

    public List<TacheKPIDTO> getListeTachesEcheanceProche() { return listeTachesEcheanceProche; }
    public void setListeTachesEcheanceProche(List<TacheKPIDTO> listeTachesEcheanceProche) { this.listeTachesEcheanceProche = listeTachesEcheanceProche; }

    public double getChargeEstimee() { return chargeEstimee; }
    public void setChargeEstimee(double chargeEstimee) { this.chargeEstimee = chargeEstimee; }

    public double getChargeConsommee() { return chargeConsommee; }
    public void setChargeConsommee(double chargeConsommee) { this.chargeConsommee = chargeConsommee; }

    public double getChargeRestanteEstimee() { return chargeRestanteEstimee; }
    public void setChargeRestanteEstimee(double chargeRestanteEstimee) { this.chargeRestanteEstimee = chargeRestanteEstimee; }

    public double getTauxConsommationCharge() { return tauxConsommationCharge; }
    public void setTauxConsommationCharge(double tauxConsommationCharge) { this.tauxConsommationCharge = tauxConsommationCharge; }

    public double getIndiceEfficacite() { return indiceEfficacite; }
    public void setIndiceEfficacite(double indiceEfficacite) { this.indiceEfficacite = indiceEfficacite; }

    public int getNombreProblemes() { return nombreProblemes; }
    public void setNombreProblemes(int nombreProblemes) { this.nombreProblemes = nombreProblemes; }

    public int getNombreRisques() { return nombreRisques; }
    public void setNombreRisques(int nombreRisques) { this.nombreRisques = nombreRisques; }

    public int getNombreProblemesPersistants() { return nombreProblemesPersistants; }
    public void setNombreProblemesPersistants(int nombreProblemesPersistants) { this.nombreProblemesPersistants = nombreProblemesPersistants; }

    public int getNombreRecommandations() { return nombreRecommandations; }
    public void setNombreRecommandations(int nombreRecommandations) { this.nombreRecommandations = nombreRecommandations; }

    public List<String> getListeProblemes() { return listeProblemes; }
    public void setListeProblemes(List<String> listeProblemes) { this.listeProblemes = listeProblemes; }

    public List<String> getListeRisques() { return listeRisques; }
    public void setListeRisques(List<String> listeRisques) { this.listeRisques = listeRisques; }

    public List<String> getListeRecommandations() { return listeRecommandations; }
    public void setListeRecommandations(List<String> listeRecommandations) { this.listeRecommandations = listeRecommandations; }

    public double getBudgetTotal() { return budgetTotal; }
    public void setBudgetTotal(double budgetTotal) { this.budgetTotal = budgetTotal; }

    public double getBudgetPrevision() { return budgetPrevision; }
    public void setBudgetPrevision(double budgetPrevision) { this.budgetPrevision = budgetPrevision; }

    public double getBudgetRealisation() { return budgetRealisation; }
    public void setBudgetRealisation(double budgetRealisation) { this.budgetRealisation = budgetRealisation; }

    public double getEcartBudget() { return ecartBudget; }
    public void setEcartBudget(double ecartBudget) { this.ecartBudget = ecartBudget; }

    public double getTauxConsommationBudget() { return tauxConsommationBudget; }
    public void setTauxConsommationBudget(double tauxConsommationBudget) { this.tauxConsommationBudget = tauxConsommationBudget; }

    public int getTailleEquipe() { return tailleEquipe; }
    public void setTailleEquipe(int tailleEquipe) { this.tailleEquipe = tailleEquipe; }

    public List<MembreEquipeDTO> getListeMembresEquipe() { return listeMembresEquipe; }
    public void setListeMembresEquipe(List<MembreEquipeDTO> listeMembresEquipe) { this.listeMembresEquipe = listeMembresEquipe; }

    public List<ChargeMembreDTO> getChargeParMembre() { return chargeParMembre; }
    public void setChargeParMembre(List<ChargeMembreDTO> chargeParMembre) { this.chargeParMembre = chargeParMembre; }

    public double getScoreSante() { return scoreSante; }
    public void setScoreSante(double scoreSante) { this.scoreSante = scoreSante; }

    public String getNiveauSante() { return niveauSante; }
    public void setNiveauSante(String niveauSante) { this.niveauSante = niveauSante; }

    public List<ComposanteScoreDTO> getDetailScore() { return detailScore; }
    public void setDetailScore(List<ComposanteScoreDTO> detailScore) { this.detailScore = detailScore; }

    public List<AlerteKPIDTO> getAlertes() { return alertes; }
    public void setAlertes(List<AlerteKPIDTO> alertes) { this.alertes = alertes; }

    public List<PointHistoriqueKPIDTO> getHistorique() { return historique; }
    public void setHistorique(List<PointHistoriqueKPIDTO> historique) { this.historique = historique; }
}
