package com.example.demo.dto;

public class AIKPIReportDTO {
    private String scorePerformanceIA;
    private String niveauRisque;
    private String predictionDateFin;
    private String analyseGlobale;
    private String recommandationsIA;
    private String alertes;
    private boolean success;
    private String errorMessage;

    public AIKPIReportDTO() { this.success = true; }

    public AIKPIReportDTO(String errorMessage) {
        this.success = false;
        this.errorMessage = errorMessage;
    }

    public String getScorePerformanceIA() { return scorePerformanceIA; }
    public void setScorePerformanceIA(String scorePerformanceIA) { this.scorePerformanceIA = scorePerformanceIA; }

    public String getNiveauRisque() { return niveauRisque; }
    public void setNiveauRisque(String niveauRisque) { this.niveauRisque = niveauRisque; }

    public String getPredictionDateFin() { return predictionDateFin; }
    public void setPredictionDateFin(String predictionDateFin) { this.predictionDateFin = predictionDateFin; }

    public String getAnalyseGlobale() { return analyseGlobale; }
    public void setAnalyseGlobale(String analyseGlobale) { this.analyseGlobale = analyseGlobale; }

    public String getRecommandationsIA() { return recommandationsIA; }
    public void setRecommandationsIA(String recommandationsIA) { this.recommandationsIA = recommandationsIA; }

    public String getAlertes() { return alertes; }
    public void setAlertes(String alertes) { this.alertes = alertes; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
