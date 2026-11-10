package com.example.demo.dto;

import java.time.LocalDate;

/**
 * Une date du calendrier des dépôts. {@code joursRestants} n'existe que pour la fiche attendue (négatif si elle est
 * en retard), {@code ficheSuiviId} et {@code numeroRapport} que pour une fiche déposée.
 */
public record EcheanceSuiviDTO(String projetId, String nomProjet, LocalDate date, Statut statut, Long joursRestants,
                               Integer periodiciteMois, String ficheSuiviId, String numeroRapport) {

    public enum Statut {
        DEPOSEE,
        EN_RETARD,
        A_DEPOSER,
        /** Date projetée après la prochaine échéance : elle se recalcule à chaque dépôt. */
        PREVUE
    }
}
