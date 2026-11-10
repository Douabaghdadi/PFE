package com.example.demo.dto;

import java.util.List;

/**
 * Calendrier des dépôts d'un chef de projet. {@code projetsSansEcheance} nomme les projets en cours dont aucune date
 * n'est encore connue, parce que le pilote qualité n'a pas fixé leur périodicité.
 */
public record CalendrierSuiviDTO(List<EcheanceSuiviDTO> echeances, List<String> projetsSansEcheance) {
}
