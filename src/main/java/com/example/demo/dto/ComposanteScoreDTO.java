package com.example.demo.dto;

/**
 * Une composante du score de santé : rend le calcul lisible et auditable côté rapport.
 */
public class ComposanteScoreDTO {
    private String libelle;
    private double points;
    private double pointsMax;
    private String commentaire;

    public ComposanteScoreDTO() {}

    public ComposanteScoreDTO(String libelle, double points, double pointsMax, String commentaire) {
        this.libelle = libelle;
        this.points = points;
        this.pointsMax = pointsMax;
        this.commentaire = commentaire;
    }

    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }

    public double getPoints() { return points; }
    public void setPoints(double points) { this.points = points; }

    public double getPointsMax() { return pointsMax; }
    public void setPointsMax(double pointsMax) { this.pointsMax = pointsMax; }

    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
}
