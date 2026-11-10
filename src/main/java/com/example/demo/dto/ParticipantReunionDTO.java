package com.example.demo.dto;

/** Personne que le chef de projet peut inviter : l'adresse email s'affiche, le nom sert d'info-bulle. */
public record ParticipantReunionDTO(String email, String nom) {
}
