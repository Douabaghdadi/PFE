package com.example.demo.dto;

import java.util.List;

/**
 * Membres de l'équipe d'un projet qu'on peut inviter à une réunion. Google a besoin d'une adresse :
 * {@code sansEmail} compte ceux dont la fiche projet n'en donne pas.
 */
public record EquipeReunionDTO(List<ParticipantReunionDTO> membres, int sansEmail) {
}
