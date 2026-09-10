package com.example.demo.dto;

public class MembreEquipeDTO {
    private String nom;
    private String role;

    public MembreEquipeDTO() {
    }

    public MembreEquipeDTO(String nom, String role) {
        this.nom = nom;
        this.role = role;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
