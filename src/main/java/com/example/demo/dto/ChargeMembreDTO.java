package com.example.demo.dto;

/**
 * Répartition de la charge et de l'avancement par membre de l'équipe.
 */
public class ChargeMembreDTO {
    private String nom;
    private int nombreTaches;
    private int tachesTerminees;
    private int tachesEnRetard;
    private double avancementMoyen;
    private double chargeEstimee;
    private double chargeConsommee;

    public ChargeMembreDTO() {}

    public ChargeMembreDTO(String nom) { this.nom = nom; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public int getNombreTaches() { return nombreTaches; }
    public void setNombreTaches(int nombreTaches) { this.nombreTaches = nombreTaches; }

    public int getTachesTerminees() { return tachesTerminees; }
    public void setTachesTerminees(int tachesTerminees) { this.tachesTerminees = tachesTerminees; }

    public int getTachesEnRetard() { return tachesEnRetard; }
    public void setTachesEnRetard(int tachesEnRetard) { this.tachesEnRetard = tachesEnRetard; }

    public double getAvancementMoyen() { return avancementMoyen; }
    public void setAvancementMoyen(double avancementMoyen) { this.avancementMoyen = avancementMoyen; }

    public double getChargeEstimee() { return chargeEstimee; }
    public void setChargeEstimee(double chargeEstimee) { this.chargeEstimee = chargeEstimee; }

    public double getChargeConsommee() { return chargeConsommee; }
    public void setChargeConsommee(double chargeConsommee) { this.chargeConsommee = chargeConsommee; }
}
