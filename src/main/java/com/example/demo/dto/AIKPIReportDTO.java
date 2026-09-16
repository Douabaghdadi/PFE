package com.example.demo.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Analyse des KPI d'un projet produite par le modele Gemini :
 * une lecture par axe de pilotage, assortie d'actions correctives priorisees.
 */
public class AIKPIReportDTO {
    /** Niveaux de risque et de confiance normalises renvoyes par le modele. */
    public static final String FAIBLE = "FAIBLE";
    public static final String MOYEN = "MOYEN";
    public static final String ELEVE = "ELEVE";
    public static final String CRITIQUE = "CRITIQUE";

    private int scorePerformance;
    private String niveauRisque;
    /** Fiabilité de l'analyse au vu des données réellement disponibles. */
    private String niveauConfiance;
    private String syntheseExecutive;

    private String predictionDateFin;
    private String justificationPrediction;

    private List<AxeAnalyseIADTO> axes = new ArrayList<>();
    private List<String> forces = new ArrayList<>();
    private List<String> pointsDeVigilance = new ArrayList<>();
    private List<ActionIADTO> actions = new ArrayList<>();
    private List<String> alertes = new ArrayList<>();

    // Traçabilité de la génération
    private String genereLe;
    private String modele;
    private boolean depuisCache;

    private boolean success;
    private String errorMessage;

    public AIKPIReportDTO() { this.success = true; }

    public AIKPIReportDTO(String errorMessage) {
        this.success = false;
        this.errorMessage = errorMessage;
    }

    public int getScorePerformance() { return scorePerformance; }
    public void setScorePerformance(int scorePerformance) { this.scorePerformance = scorePerformance; }

    public String getNiveauRisque() { return niveauRisque; }
    public void setNiveauRisque(String niveauRisque) { this.niveauRisque = niveauRisque; }

    public String getNiveauConfiance() { return niveauConfiance; }
    public void setNiveauConfiance(String niveauConfiance) { this.niveauConfiance = niveauConfiance; }

    public String getSyntheseExecutive() { return syntheseExecutive; }
    public void setSyntheseExecutive(String syntheseExecutive) { this.syntheseExecutive = syntheseExecutive; }

    public String getPredictionDateFin() { return predictionDateFin; }
    public void setPredictionDateFin(String predictionDateFin) { this.predictionDateFin = predictionDateFin; }

    public String getJustificationPrediction() { return justificationPrediction; }
    public void setJustificationPrediction(String justificationPrediction) { this.justificationPrediction = justificationPrediction; }

    public List<AxeAnalyseIADTO> getAxes() { return axes; }
    public void setAxes(List<AxeAnalyseIADTO> axes) { this.axes = axes; }

    public List<String> getForces() { return forces; }
    public void setForces(List<String> forces) { this.forces = forces; }

    public List<String> getPointsDeVigilance() { return pointsDeVigilance; }
    public void setPointsDeVigilance(List<String> pointsDeVigilance) { this.pointsDeVigilance = pointsDeVigilance; }

    public List<ActionIADTO> getActions() { return actions; }
    public void setActions(List<ActionIADTO> actions) { this.actions = actions; }

    public List<String> getAlertes() { return alertes; }
    public void setAlertes(List<String> alertes) { this.alertes = alertes; }

    public String getGenereLe() { return genereLe; }
    public void setGenereLe(String genereLe) { this.genereLe = genereLe; }

    public String getModele() { return modele; }
    public void setModele(String modele) { this.modele = modele; }

    public boolean isDepuisCache() { return depuisCache; }
    public void setDepuisCache(boolean depuisCache) { this.depuisCache = depuisCache; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
